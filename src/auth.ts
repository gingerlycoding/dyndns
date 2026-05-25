// Verify HTTP Basic Auth credentials against environment secrets

// crypto.subtle.timingSafeEqual is a Workers-specific extension that returns a
// boolean synchronously (unlike the rest of WebCrypto). It requires equal-length
// inputs, so we pad to the longer length and check the real lengths after.
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	const maxLen = Math.max(a.byteLength, b.byteLength);
	const paddedA = new Uint8Array(maxLen);
	const paddedB = new Uint8Array(maxLen);
	paddedA.set(a);
	paddedB.set(b);
	const equal = crypto.subtle.timingSafeEqual(paddedA, paddedB);
	return equal && a.byteLength === b.byteLength;
}

export interface AuthEnv {
	BASIC_AUTH_USERNAME: string;
	BASIC_AUTH_PASSWORD: string;
}

export function verifyAuth(request: Request, env: AuthEnv): boolean {
	const header = request.headers.get("Authorization");
	// RFC 7235 §2.1: the auth scheme name is case-insensitive.
	if (!header || header.slice(0, 6).toLowerCase() !== "basic ") {
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
	const userMatch = constantTimeEqual(encoder.encode(env.BASIC_AUTH_USERNAME), encoder.encode(username));
	const passMatch = constantTimeEqual(encoder.encode(env.BASIC_AUTH_PASSWORD), encoder.encode(password));

	return userMatch && passMatch;
}
