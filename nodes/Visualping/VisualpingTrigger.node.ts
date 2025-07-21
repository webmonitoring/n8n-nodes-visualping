import type {
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IHookFunctions,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import {
	getJobData,
	getWebhookUrls,
	testWebhookUrl,
	updateJobWebhookUrl,
} from './GenericFunctions';
import { listSearch } from './methods';

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
				displayName: 'Job',
				name: 'job',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'jobSearch',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[0-9]{2,}',
									errorMessage: 'Not a valid Visualping Job ID',
								},
							},
						],
						placeholder: 'e.g. 67884002',
						url: '=https://visualping.io/jobs/{{$value}}',
					},
				],
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: '={{"n8n-nodes-visualping/job/" + $parameter["job"]["value"]}}',
			},
		],
	};

	methods = {
		listSearch,
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const jobResource = this.getNodeParameter('job') as {
					mode: string;
					value: string | number;
				};

				try {
					const { prodUrl } = getWebhookUrls(webhookUrl);
					const { webhookJobUrl } = await getJobData.call(
						this,
						Number(jobResource.value),
					);
					return webhookJobUrl === prodUrl;
				} catch (error) {
					if (error.response && error.response.status === 404) {
						return false;
					}
					throw error;
				}
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const workspaceId = this.getNodeParameter('workspaceId') as number;
				const jobResource = this.getNodeParameter('job') as {
					mode: string;
					value: string | number;
				};

				const { prodUrl, testUrl } = getWebhookUrls(webhookUrl);

				await testWebhookUrl.call(this, testUrl, Number(jobResource.value));
				await updateJobWebhookUrl.call(this, prodUrl, Number(jobResource.value), workspaceId);

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				// TODO: Delete webhook from Visualping

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
