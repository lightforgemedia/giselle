import { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";

// MARK: Types

export type GitHubUserCredential = {
	accessToken: string;
	expiresAt: Date | null;
	refreshToken: string | null;
};

// MARK: Errors

export class GitHubTokenRefreshError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = this.constructor.name;
		Object.setPrototypeOf(this, GitHubTokenRefreshError.prototype);
	}
}

/**
 * Determines if the given error requires authorization.
 * if return value is true, the user should be redirected to the authorization page.
 *
 * see {@link https://supabase.com/docs/reference/javascript/auth-signinwithoauth}
 *
 * @param error - The error to check.
 * @returns True if the error requires authorization, false otherwise.
 */
export function needsAuthorization(error: unknown) {
	if (error instanceof GitHubTokenRefreshError) {
		return true;
	}
	if (error instanceof RequestError) {
		return error.status === 401 || error.status === 403 || error.status === 404;
	}
	return false;
}

export class GitHubUserClient {
	private clientId: string;
	private clientSecret: string;

	constructor(
		private token: GitHubUserCredential,
		private refreshCredentialsFunc: (
			provider: string,
			accessToken: string,
			refreshToken: string,
			expiresAt: Date,
			scope: string,
			tokenType: string,
		) => Promise<void>,
	) {
		const clientId = process.env.GITHUB_APP_CLIENT_ID;
		if (!clientId) {
			throw new Error("GITHUB_APP_CLIENT_ID is empty");
		}
		const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
		if (!clientSecret) {
			throw new Error("GITHUB_APP_CLIENT_SECRET is empty");
		}

		this.clientId = clientId;
		this.clientSecret = clientSecret;
	}

	async getUser() {
		const cli = await this.buildClient();
		const res = await cli.request("GET /user");
		return res.data;
	}

	private async buildClient() {
		if (this.needsRefreshAccessToken()) {
			await this.refreshAccessToken();
		}

		return new Octokit({
			auth: this.token.accessToken,
			headers: {
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});
	}

	private needsRefreshAccessToken() {
		// Supabase auth doesn't fetch `expiresAt` on login
		return this.token.expiresAt == null || this.token.expiresAt < new Date();
	}

	private async refreshAccessToken() {
		if (this.token.refreshToken == null) {
			throw new GitHubTokenRefreshError("Refresh token is not available");
		}
		const formData = {
			client_id: this.clientId,
			client_secret: this.clientSecret,
			refresh_token: this.token.refreshToken,
			grant_type: "refresh_token",
		};
		const formBody = Object.keys(formData)
			.map(
				(k) =>
					`${encodeURIComponent(k)}=${encodeURIComponent(
						formData[k as keyof typeof formData],
					)}`,
			)
			.join("&");
		const response = await fetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
					Accept: "application/json",
				},
				body: formBody,
			},
		);

		if (!response.ok) {
			throw new GitHubTokenRefreshError("Failed to refresh access token");
		}

		const data = await response.json();
		if ("error" in data) {
			throw new GitHubTokenRefreshError("Failed to refresh access token", {
				cause: data,
			});
		}

		const accessToken = data.access_token;
		const expiresAt = new Date(Date.now() + data.expires_in * 1000);
		const refreshToken = data.refresh_token;
		const scope = data.scope;
		const tokenType = data.token_type;

		try {
			await this.refreshCredentialsFunc(
				"github",
				accessToken,
				refreshToken,
				expiresAt,
				scope,
				tokenType,
			);
		} catch (error) {
			throw new GitHubTokenRefreshError(
				"Failed to save refreshed access token",
				{
					cause: error,
				},
			);
		}

		this.token = { accessToken, expiresAt, refreshToken };
	}
}
