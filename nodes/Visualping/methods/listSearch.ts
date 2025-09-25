import type {
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { apiRoutes, getUserData } from '../GenericFunctions';

export async function jobSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodePropertyOptions[] = [];

	const { organisation } = await getUserData.call(this);

	try {
		const options: IHttpRequestOptions = {
			method: 'GET',
			url: apiRoutes.job,
			json: true,
			qs: {
				pageSize: 100,
				pageIndex: 0,
				mode: 'normal',
				organisationId: organisation.id,
				sortBy: '',
				fullTextSearchFilter: filter,
			},
			headers: {
				'x-api-client': 'visualping.io-n8n-nodes-visualping',
			},
		}

		const response = await this.helpers.httpRequestWithAuthentication.call(this,  'visualpingCredentialsApi', options);

		const jobs = response.jobs || response || [];

		for (const job of jobs) {
			if (job.id === undefined) {
				continue;
			}

			const jobName = `${job.description} (ID: ${job.id})`;
			
			returnData.push({
				name: jobName,
				value: job.id,
				description: job.url,
			});
		}
	} catch (error) {
	}

	return {
		results: returnData,
	};
}
