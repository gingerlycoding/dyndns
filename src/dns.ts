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
	const lookupUrl = `${CF_API}/zones/${env.CF_ZONE_ID}/dns_records?name=${hostname}&type=A`;
	const lookupRes = await fetch(lookupUrl, { headers });
	const lookupData = (await lookupRes.json()) as {
		success: boolean;
		result: { id: string; content: string }[];
	};

	if (!lookupData.success || lookupData.result.length === 0) {
		return { status: "error", ip, message: "DNS record not found" };
	}

	const record = lookupData.result[0];

	// Step 2: Check if IP already matches
	if (record.content === ip) {
		return { status: "nochg", ip };
	}

	// Step 3: Update the record
	const patchUrl = `${CF_API}/zones/${env.CF_ZONE_ID}/dns_records/${record.id}`;
	const patchRes = await fetch(patchUrl, {
		method: "PATCH",
		headers,
		body: JSON.stringify({ content: ip, ttl: 60, proxied: false }),
	});
	const patchData = (await patchRes.json()) as { success: boolean };

	if (!patchData.success) {
		return { status: "error", ip, message: "Failed to update DNS record" };
	}

	return { status: "good", ip };
}
