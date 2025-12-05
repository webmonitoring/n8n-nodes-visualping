import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestOptions,
} from 'n8n-workflow';

export const apiRoutes = {
	auth: 'https://api.visualping.io/v2/token',
	job: 'https://job.api.visualping.io/v2/jobs',
	account: 'https://account.api.visualping.io',
};

export async function testWebhookUrl(this: IHookFunctions, webhookUrl: string, jobId: number) {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${apiRoutes.job}/notification/push`,
		json: true,
		headers: {
			'x-api-client': 'visualping.io-n8n-nodes-visualping',
		},
		body: {
			jobId: Number(jobId),
			notificationType: 'webhook',
			url: webhookUrl,
		},
	};

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'visualpingCredentialsApi',
		options,
	);
	return response;
}

export async function getUserData(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
): Promise<{ organisation?: { id?: number } }> {
	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `${apiRoutes.account}/describe-user`,
		json: true,
		headers: {
			'x-api-client': 'visualping.io-n8n-nodes-visualping',
		},
	};

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'visualpingCredentialsApi',
		options,
	);
	return response;
}

export async function updateJobWebhookUrl(this: IHookFunctions, webhookUrl: string, jobId: number) {
	const { organisation } = await getUserData.call(this);

	const options: IHttpRequestOptions = {
		method: 'PUT',
		url: `${apiRoutes.job}/${jobId}`,
		json: true,
		headers: {
			'x-api-client': 'visualping.io-n8n-nodes-visualping',
		},
		body: {
			...(organisation?.id && { organisationId: organisation.id }),
			notification: {
				config: {
					n8n: {
						url: webhookUrl,
						active: true,
						notificationType: 'webhook',
					},
				},
			},
		},
	};

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'visualpingCredentialsApi',
		options,
	);
	return response;
}

export async function deleteJobWebhookUrl(this: IHookFunctions, webhookUrl: string, jobId: number) {
	const { organisation } = await getUserData.call(this);

	const options: IHttpRequestOptions = {
		method: 'PUT',
		url: `${apiRoutes.job}/${jobId}`,
		json: true,
		headers: {
			'x-api-client': 'visualping.io-n8n-nodes-visualping',
		},
		body: {
			...(organisation?.id && { organisationId: organisation.id }),
			notification: {
				config: {
					n8n: {
						url: webhookUrl,
						active: false,
						notificationType: 'webhook',
					},
				},
			},
		},
	};

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'visualpingCredentialsApi',
		options,
	);
	return response;
}

export async function getJobData(this: IHookFunctions, jobId: number) {
	const { organisation } = await getUserData.call(this);

	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `${apiRoutes.job}/${jobId}`,
		body: {
			...(organisation?.id && { organisationId: organisation.id }),
		},
		json: true,
		headers: {
			'x-api-client': 'visualping.io-n8n-nodes-visualping',
		},
	};

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'visualpingCredentialsApi',
		options,
	);

	const webhookData = response?.notification?.config?.n8n;

	return { webhookData, ...response };
}

export function getWebhookUrls(webhookUrl: string): { prodUrl: string; testUrl: string } {
	// Parse the URL to extract components
	const urlParts = webhookUrl.split('/');

	// Find the workflow ID (it's the UUID after /webhook/ or /webhook-test/)
	const workflowIdIndex = urlParts.findIndex(
		(part: string) => part === 'webhook' || part === 'webhook-test',
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
