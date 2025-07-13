import { useApi } from "@/lib/fetch-client";

export function useDefaultProject() {
	const api = useApi();

	const {
		data: orgsData,
		isError: orgsError,
		isLoading: orgsLoading,
	} = api.useQuery("get", "/orgs");

	// Get the first organization ID if available
	const defaultOrgId = orgsData?.organizations?.[0]?.id || null;

	const {
		data: projectsData,
		isError: projectsError,
		isLoading: projectsLoading,
	} = api.useQuery(
		"get",
		"/orgs/{id}/projects",
		{
			params: {
				path: { id: defaultOrgId || "" },
			},
		},
		{
			enabled: !!defaultOrgId,
		},
	);

	// Handle loading states
	if (orgsLoading || (defaultOrgId && projectsLoading)) {
		return { data: null, isError: false, isLoading: true };
	}

	// Handle organization errors
	if (orgsError) {
		console.error("Error loading organizations:", orgsError);
		return { data: null, isError: true, isLoading: false };
	}

	if (
		!orgsData ||
		!orgsData.organizations ||
		!Array.isArray(orgsData.organizations)
	) {
		console.error("Invalid organizations data:", orgsData);
		return { data: null, isError: true, isLoading: false };
	}

	if (orgsData.organizations.length === 0) {
		console.log("No organizations found");
		return { data: null, isError: true, isLoading: false };
	}

	const defaultOrg = orgsData.organizations[0];

	if (!defaultOrg || !defaultOrg.id) {
		console.error("Invalid organization data:", defaultOrg);
		return { data: null, isError: true, isLoading: false };
	}

	// Handle project errors
	if (projectsError) {
		console.error("Error loading projects:", projectsError);
		return { data: null, isError: true, isLoading: false };
	}

	if (
		!projectsData ||
		!projectsData.projects ||
		!Array.isArray(projectsData.projects)
	) {
		console.error("Invalid projects data:", projectsData);
		return { data: null, isError: true, isLoading: false };
	}

	if (projectsData.projects.length === 0) {
		console.log("No projects found for organization:", defaultOrg.id);
		return { data: null, isError: true, isLoading: false };
	}

	return {
		data: projectsData.projects[0],
		isError: false,
		isLoading: false,
	};
}
