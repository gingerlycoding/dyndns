// Verify HTTP Basic Auth credentials against environment secrets

export interface AuthEnv {
	BASIC_AUTH_USERNAME: string;
	BASIC_AUTH_PASSWORD: string;
}

export async function verifyAuth(request: Request, env: AuthEnv): Promise<boolean> {
	const header = request.headers.get("Authorization");
	if (!header || !header.startsWith("Basic ")) {
		return false;
	}

	let decoded: string;
	try {
		decoded = atob(header.slice(6));
	} catch {
		return false;
	}

	const colonIndex = decoded.indexOf(":");
	if (colonIndex === -1) {
		return false;
	}

	const username = decoded.slice(0, colonIndex);
	const password = decoded.slice(colonIndex + 1);

	const encoder = new TextEncoder();
	const expectedUser = encoder.encode(env.BASIC_AUTH_USERNAME);
	const actualUser = encoder.encode(username);
	const expectedPass = encoder.encode(env.BASIC_AUTH_PASSWORD);
	const actualPass = encoder.encode(password);

	if (expectedUser.byteLength !== actualUser.byteLength ||
		expectedPass.byteLength !== actualPass.byteLength) {
		return false;
	}

	const userMatch = crypto.subtle.timingSafeEqual(expectedUser, actualUser);
	const passMatch = crypto.subtle.timingSafeEqual(expectedPass, actualPass);

	return userMatch && passMatch;
}
