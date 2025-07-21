import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { getUserData, requestIdToken } from '../GenericFunctions';

export async function jobSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodePropertyOptions[] = [];

	const id_token = await requestIdToken.call(this);
	const { organisation } = await getUserData.call(this);

	try {
		const response = await this.helpers.request({
			method: 'GET',
			url: `https://job.api.visualping.io/v2/jobs?pageSize=100&pageIndex=0${filter ? `&fullTextSearchFilter=${filter}` : ''}&mode=normal&sortBy=&organisationId=${organisation.id}`,
			headers: {
				'Authorization': id_token
			},
			json: true,
		});

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
