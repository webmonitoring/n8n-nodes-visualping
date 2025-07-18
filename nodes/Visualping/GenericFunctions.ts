import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { authApiUrl, VisualpingCredentials } from '../../credentials/VisualpingCredentialsApi.credentials';

export async function requestIdToken(this: IExecuteFunctions) {
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
