import type {
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IHookFunctions,
} from 'n8n-workflow';
import {  NodeConnectionType } from 'n8n-workflow';
import { getJobData, getWebhookUrls, getWorkspaces, testWebhookUrl, updateJobWebhookUrl } from './GenericFunctions';

export class VisualpingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Visualping Trigger',
		name: 'visualpingTrigger',
		icon: 'file:icons/visualping.svg',
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
				displayName: 'Workspace (business account)',
				name: 'workspaceId',
				type: 'options',
				description: 'The Visualping Workspace where the job is running (business account required)',
				typeOptions: {
				   loadOptionsMethod: 'getWorkspaces',
				},
				required: true,
				default: '',
			},
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

	methods = {
		loadOptions: {
		  getWorkspaces,
		},
	};
	
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');


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
				const workspaceId = this.getNodeParameter('workspaceId') as number;
				const jobId = this.getNodeParameter('jobId') as number;

				const { prodUrl, testUrl } = getWebhookUrls(webhookUrl);
				const { webhookJobUrl } = await getJobData.call(this, jobId, workspaceId);

				await testWebhookUrl.call(this, testUrl, jobId);

				if(webhookJobUrl !== prodUrl) {
					await updateJobWebhookUrl.call(this, prodUrl, jobId, workspaceId);
				}

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