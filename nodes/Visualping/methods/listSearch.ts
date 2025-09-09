import type {
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { getUserData } from '../GenericFunctions';

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
			url: `https://job.api.visualping.io/v2/jobs?pageSize=100&pageIndex=0${filter ? `&fullTextSearchFilter=${filter}` : ''}&mode=normal&sortBy=&organisationId=${organisation.id}`,
			json: true,
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
