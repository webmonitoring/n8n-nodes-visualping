import { IExecuteFunctions, NodeOperationError, IHookFunctions } from 'n8n-workflow';
import { authApiUrl, VisualpingCredentials } from '../../credentials/VisualpingCredentialsApi.credentials';

export async function requestIdToken(this: IExecuteFunctions | IHookFunctions) {
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
			'Authorization': id_token
		},
	});

	return response;
}

export async function updateJobWebhookUrl(this: IHookFunctions, webhookUrl: string, jobId: number, workspaceId: number) {

}
