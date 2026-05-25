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

// Cloudflare treats ttl=1 as "automatic" for non-proxied records.
const TTL_AUTO = 1;

function dynamicComment(): string {
	return `Dynamically set for UniFi gateway at ${new Date().toISOString()}`;
}

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

	// Step 2: Create or update the record. DDNS expects exactly one A record per
	// hostname; if multiple exist, an operator has added one by hand. Refuse to
	// update rather than silently pick a winner.
	const records = lookupData.result ?? [];

	if (records.length === 0) {
		return createDnsRecord(env, headers, hostname, ip);
	}

	if (records.length > 1) {
		console.warn(`Refusing to update ${hostname}: ${records.length} A records exist`);
		return {
			status: "error",
			ip,
			message: `Refusing to update: ${records.length} A records exist for ${hostname}`,
		};
	}

	const record = records[0];

	if (record.content === ip) {
		return { status: "nochg", ip };
	}

	return patchDnsRecord(headers, env.CF_ZONE_ID, hostname, record.id, record.content, ip);
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
		body: JSON.stringify({
			type: "A",
			name: hostname,
			content: ip,
			ttl: TTL_AUTO,
			proxied: false,
			comment: dynamicComment(),
		}),
	});

	if (!res.ok) {
		return { status: "error", ip, message: `DNS create failed: HTTP ${res.status}` };
	}

	const data = (await res.json()) as { success: boolean };
	if (!data.success) {
		return { status: "error", ip, message: "Failed to create DNS record" };
	}

	console.log(`Created A record: ${hostname} -> ${ip}`);
	return { status: "good", ip };
}

async function patchDnsRecord(
	headers: Record<string, string>,
	zoneId: string,
	hostname: string,
	recordId: string,
	fromIp: string,
	toIp: string,
): Promise<DnsResult> {
	const url = `${CF_API}/zones/${zoneId}/dns_records/${recordId}`;
	const res = await fetch(url, {
		method: "PATCH",
		headers,
		body: JSON.stringify({
			content: toIp,
			ttl: TTL_AUTO,
			proxied: false,
			comment: dynamicComment(),
		}),
	});

	if (!res.ok) {
		return { status: "error", ip: toIp, message: `DNS update failed: HTTP ${res.status}` };
	}

	const data = (await res.json()) as { success: boolean };
	if (!data.success) {
		return { status: "error", ip: toIp, message: "Failed to update DNS record" };
	}

	console.log(`Updated A record: ${hostname} ${fromIp} -> ${toIp}`);
	return { status: "good", ip: toIp };
}
