import {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	IAuthenticateGeneric,
} from 'n8n-workflow';

export const authApiUrl = 'https://api.visualping.io/v2/token';

export type VisualpingCredentials = {
	email: string;
	password: string;
};

export class VisualpingCredentialsApi implements ICredentialType {
	name = 'visualpingCredentialsApi';
	displayName = 'Visualping Credentials API';
	icon = 'file:visualping.svg' as const;
	documentationUrl = 'https://api.visualping.io/doc.html#section/Authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
			description: 'Your Visualping account email',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Your Visualping account password',
		},
		{
			displayName: 'ID Token',
			name: 'id_token',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject): Promise<{ id_token: string }> {
		// Get the id_token during pre-authentication
		const authResponse = await this.helpers.httpRequest({
			method: 'POST',
			url: authApiUrl,
			json: true,
			headers: {
				'x-api-client': 'visualping.io-n8n-nodes-visualping',
			},
			body: {
				email: credentials.email,
				password: credentials.password,
				method: 'PASSWORD',
			},
		});

		if (!authResponse.id_token) {
			throw new Error('Authentication failed: No token received from Visualping API');
		}

		return {
			id_token: authResponse.id_token,
		};
	};

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{ $credentials.id_token }}',
				'x-api-client': 'visualping.io-n8n-nodes-visualping',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: authApiUrl,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-client': 'visualping.io-n8n-nodes-visualping',
			},
			body: {
				method: 'PASSWORD',
				email: '={{ $credentials.email }}',
				password: '={{ $credentials.password }}',
			},
		},
	};
}
