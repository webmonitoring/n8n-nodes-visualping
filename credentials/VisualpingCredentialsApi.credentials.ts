import {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export const authApiUrl = 'https://beta.account.api.visualping.io/v2/token';

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
	];

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
