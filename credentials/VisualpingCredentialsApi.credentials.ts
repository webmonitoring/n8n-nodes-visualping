import {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VisualpingCredentialsApi implements ICredentialType {
	name = 'visualpingCredentialsApi';
	displayName = 'Visualping Credentials';
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
			baseURL: 'https://api.visualping.io',
			url: '/v2/token',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				method: 'PASSWORD',
				email: '={{ $credentials.email }}',
				password: '={{ $credentials.password }}',
			},
		},
	};
}
