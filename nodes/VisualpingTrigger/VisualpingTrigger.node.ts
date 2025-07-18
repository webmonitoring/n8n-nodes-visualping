import type {
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IHookFunctions,
} from 'n8n-workflow';
import {  NodeConnectionType } from 'n8n-workflow';
import { testWebhookUrl } from '../Visualping/GenericFunctions';

/**
 * Extract production and test URLs from a webhook URL
 * @param webhookUrl - The webhook URL from getNodeWebhookUrl
 * @returns Object containing prodUrl and testUrl
 */
function getWebhookUrls(webhookUrl: string): { prodUrl: string; testUrl: string } {
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

export class VisualpingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Visualping Trigger',
		name: 'visualpingTrigger',
		icon: 'file:visualping.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Visualping calls the webhook',
		defaults: {
			name: 'Visualping Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'visualpingCredentialsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				default: '',
				description: 'The Visualping Job ID to listen for',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: '={{"n8n-nodes-visualping/job/" + $parameter["jobId"]}}',
			},
		],
	};
	
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				// @ts-ignore
				console.log(webhookData);

				if (webhookData.webhookId === undefined) {
					return false;
				}
				try {
				} catch (error) {
					if (error.response.status === 404) {
						delete webhookData.webhookId;
						delete webhookData.webhookEvents;
						return false;
					}
					throw error;
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const jobId = this.getNodeParameter('jobId') as number;

				const { prodUrl, testUrl } = getWebhookUrls(webhookUrl);

				await testWebhookUrl.call(this, testUrl, jobId);

				await updateJobWebhookUrl(this, prodUrl);

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
		
					try {
					} catch (error) {
						if (error.response.status !== 404) {
							return false;
						}
					}
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<any> {
		const body = this.getRequestObject().body;
		
		return {
			workflowData: [
				[
					{
						json: {
							...body,
						},
					},
				],
			],
		};
	}
} 