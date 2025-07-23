import { IExecuteFunctions, NodeOperationError, IHookFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { authApiUrl, VisualpingCredentials } from '../../credentials/VisualpingCredentialsApi.credentials';

export async function requestIdToken(this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions) {
	const credentials = (await this.getCredentials(
		'visualpingCredentialsApi',
	)) as VisualpingCredentials;

	let id_token: string;
	try {
		const authResponse = await this.helpers.request({
			method: 'POST',
			url: authApiUrl,
			body: {
				email: credentials.email,
				password: credentials.password,
				method: 'PASSWORD',
			},
			json: true,
			headers: {
				'x-api-client': 'visualping.io-n8n-nodes-visualping',
			},
		});
		id_token = authResponse.id_token;
		if (!id_token) throw new Error('No token received from Visualping API');
		return id_token;
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Authentication failed: ' + error.message);
	}
}

export async function testWebhookUrl(this: IHookFunctions, webhookUrl: string, jobId: number) {
	const id_token = await requestIdToken.call(this);

	const response = await this.helpers.request({
		method: 'POST',
		url: "https://job.api.visualping.io/v2/jobs/notification/push",
		body: {
			jobId: Number(jobId),
			notificationType: "webhook",
			url: webhookUrl,
		},
		headers: {
			'Authorization': id_token,
			'x-api-client': 'visualping.io-n8n-nodes-visualping',
		},
	});

	return response;
}

export async function getUserData(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
  ): Promise<{organisation: {id: number}}> {
	const id_token = await requestIdToken.call(this);

	const response = await this.helpers.request({
		method: 'GET',
		url: `https://account.api.visualping.io/describe-user`,
		headers: {
			'Authorization': id_token,
			'x-api-client': 'visualping.io-n8n-nodes-visualping',
		},
		json: true,
	});


	return response;
  }

export async function updateJobWebhookUrl(this: IHookFunctions, webhookUrl: string, jobId: number) {
	const id_token = await requestIdToken.call(this);
	const { organisation } = await getUserData.call(this);

	const response = await this.helpers.request({
		method: 'PUT',
		url: `https://job.api.visualping.io/v2/jobs/${jobId}`,
		body: {
			organisationId: organisation.id,
			"notification": {
				"config": {
					"n8n": {
						"url": webhookUrl,
						"active": true,
						"notificationType": "webhook"
					}
				}
			}
		},
		headers: {
			'Authorization': id_token,
			'x-api-client': 'visualping.io-n8n-nodes-visualping',
		},
	});

	return response;
}

export async function deleteJobWebhookUrl(this: IHookFunctions, webhookUrl: string, jobId: number) {
	const id_token = await requestIdToken.call(this);
	const { organisation } = await getUserData.call(this);

	const response = await this.helpers.request({
		method: 'PUT',
		url: `https://job.api.visualping.io/v2/jobs/${jobId}`,
		body: {
			organisationId: organisation.id,
			"notification": {
				"config": {
					"n8n": {
						"url": webhookUrl,
						"active": false,
						"notificationType": "webhook"
					}
				}
			}
		},
		headers: {
			'Authorization': id_token,
			'x-api-client': 'visualping.io-n8n-nodes-visualping',
		},
	});

	return response;
}



export async function getJobData(this: IHookFunctions, jobId: number) {
	const id_token = await requestIdToken.call(this);
	const { organisation } = await getUserData.call(this);

	const response = await this.helpers.request({
		method: 'GET',
		url: `https://job.api.visualping.io/v2/jobs/${jobId}?jobId=${jobId}&organisationId=${organisation.id}`,
		headers: {
			'Authorization': id_token,
			'x-api-client': 'visualping.io-n8n-nodes-visualping',
		},
		json: true,
	});

	const webhookData = response?.notification?.config?.n8n;

	return { webhookData, ...response };
}

export function getWebhookUrls(webhookUrl: string): { prodUrl: string; testUrl: string } {
	// Parse the URL to extract components
	const urlParts = webhookUrl.split('/');
	
	// Find the workflow ID (it's the UUID after /webhook/ or /webhook-test/)
	const workflowIdIndex = urlParts.findIndex((part: string) => 
		part === 'webhook' || part === 'webhook-test'
	);
	
	if (workflowIdIndex === -1 || workflowIdIndex + 1 >= urlParts.length) {
		throw new Error('Invalid webhook URL format');
	}
	
	const workflowId = urlParts[workflowIdIndex + 1];
	const remainingPath = urlParts.slice(workflowIdIndex + 2).join('/');
	
	// Get the base URL (protocol + host)
	const baseUrl = urlParts.slice(0, workflowIdIndex).join('/');
	
	// Construct the URLs
	const prodUrl = `${baseUrl}/webhook/${workflowId}/${remainingPath}`;
	const testUrl = `${baseUrl}/webhook-test/${workflowId}/${remainingPath}`;
	
	return { prodUrl, testUrl };
}


