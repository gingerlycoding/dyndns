// Cloudflare DNS API client for looking up and updating A records

export interface DnsEnv {
	CF_ZONE_ID: string;
	CF_API_TOKEN: string;
}

export type DnsResult =
	| { status: "good"; ip: string }
	| { status: "nochg"; ip: string }
	| { status: "error"; ip: string; message: string };

const CF_API = "https://api.cloudflare.com/client/v4";

export async function updateDnsRecord(
	env: DnsEnv,
	hostname: string,
	ip: string,
): Promise<DnsResult> {
	const headers = {
		Authorization: `Bearer ${env.CF_API_TOKEN}`,
		"Content-Type": "application/json",
	};

	// Step 1: Look up existing A record
	const lookupUrl = `${CF_API}/zones/${env.CF_ZONE_ID}/dns_records?name=${encodeURIComponent(hostname)}&type=A`;
	const lookupRes = await fetch(lookupUrl, { headers });

	if (!lookupRes.ok) {
		return { status: "error", ip, message: `DNS lookup failed: HTTP ${lookupRes.status}` };
	}

	const lookupData = (await lookupRes.json()) as {
		success: boolean;
		result: { id: string; content: string }[];
	};

	if (!lookupData.success) {
		return { status: "error", ip, message: "DNS lookup failed" };
	}

	// Step 2: Create or update the record
	if (!lookupData.result?.length) {
		return createDnsRecord(env, headers, hostname, ip);
	}

	const record = lookupData.result[0];

	if (record.content === ip) {
		return { status: "nochg", ip };
	}

	return patchDnsRecord(headers, env.CF_ZONE_ID, record.id, ip);
}

async function createDnsRecord(
	env: DnsEnv,
	headers: Record<string, string>,
	hostname: string,
	ip: string,
): Promise<DnsResult> {
	const url = `${CF_API}/zones/${env.CF_ZONE_ID}/dns_records`;
	const res = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify({ type: "A", name: hostname, content: ip, ttl: 60, proxied: false }),
	});

	if (!res.ok) {
		return { status: "error", ip, message: `DNS create failed: HTTP ${res.status}` };
	}

	const data = (await res.json()) as { success: boolean };
	if (!data.success) {
		return { status: "error", ip, message: "Failed to create DNS record" };
	}

	return { status: "good", ip };
}

async function patchDnsRecord(
	headers: Record<string, string>,
	zoneId: string,
	recordId: string,
	ip: string,
): Promise<DnsResult> {
	const url = `${CF_API}/zones/${zoneId}/dns_records/${recordId}`;
	const res = await fetch(url, {
		method: "PATCH",
		headers,
		body: JSON.stringify({ content: ip, ttl: 60, proxied: false }),
	});

	if (!res.ok) {
		return { status: "error", ip, message: `DNS update failed: HTTP ${res.status}` };
	}

	const data = (await res.json()) as { success: boolean };
	if (!data.success) {
		return { status: "error", ip, message: "Failed to update DNS record" };
	}

	return { status: "good", ip };
}
