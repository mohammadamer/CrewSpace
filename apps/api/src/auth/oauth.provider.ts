export interface OAuthProfile {
  provider: 'google' | 'github';
  providerUserId: string;
  email: string;
  displayName: string;
}

export interface OAuthProvider {
  readonly name: OAuthProfile['provider'];
  resolveProfile(authorizationCode: string): Promise<OAuthProfile>;
}

export class MockGoogleOAuthProvider implements OAuthProvider {
  readonly name = 'google' as const;

  async resolveProfile(authorizationCode: string): Promise<OAuthProfile> {
    return {
      provider: 'google',
      providerUserId: `mock-google-${authorizationCode}`,
      email: `google-${authorizationCode}@example.local`,
      displayName: 'Google User',
    };
  }
}

export class MockGitHubOAuthProvider implements OAuthProvider {
  readonly name = 'github' as const;

  async resolveProfile(authorizationCode: string): Promise<OAuthProfile> {
    return {
      provider: 'github',
      providerUserId: `mock-github-${authorizationCode}`,
      email: `github-${authorizationCode}@example.local`,
      displayName: 'GitHub User',
    };
  }
}
