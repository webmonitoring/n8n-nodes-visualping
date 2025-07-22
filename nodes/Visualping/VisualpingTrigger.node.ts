import type {
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IHookFunctions,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import {
	deleteJobWebhookUrl,
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
		description: 'Triggers workflow on Visualping job events',
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
				path: '={{"n8n-nodes-visualping/job/"}}',
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
				const jobId = Number(jobResource.value);

				try {
					const { prodUrl } = getWebhookUrls(webhookUrl);
					const { webhookJobUrl } = await getJobData.call(this, jobId);
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
				const jobResource = this.getNodeParameter('job') as {
					mode: string;
					value: string | number;
				};
				const jobId = Number(jobResource.value);

				const { prodUrl, testUrl } = getWebhookUrls(webhookUrl);

				await testWebhookUrl.call(this, testUrl, jobId);
				await updateJobWebhookUrl.call(this, prodUrl, jobId);

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const { prodUrl } = getWebhookUrls(webhookUrl);
				const jobResource = this.getNodeParameter('job') as {
					mode: string;
					value: string | number;
				};
				const jobId = Number(jobResource.value);

				await deleteJobWebhookUrl.call(this, prodUrl, jobId);

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
