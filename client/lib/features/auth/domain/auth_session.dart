class AuthUser {
  const AuthUser({
    required this.username,
    required this.displayName,
  });

  final String username;
  final String displayName;

  AuthUser copyWith({
    String? username,
    String? displayName,
  }) {
    return AuthUser(
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
    );
  }
}

class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresAt,
  });

  final String accessToken;
  final String refreshToken;
  final DateTime expiresAt;

  bool get isExpired => DateTime.now().isAfter(expiresAt);
}

class AuthSession {
  const AuthSession({
    required this.user,
    required this.tokens,
  });

  final AuthUser user;
  final AuthTokens tokens;

  bool get isAuthenticated => !tokens.isExpired;

  AuthSession copyWith({
    AuthUser? user,
    AuthTokens? tokens,
  }) {
    return AuthSession(
      user: user ?? this.user,
      tokens: tokens ?? this.tokens,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'username': user.username,
      'displayName': user.displayName,
      'accessToken': tokens.accessToken,
      'refreshToken': tokens.refreshToken,
      'expiresAt': tokens.expiresAt.toIso8601String(),
    };
  }

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      user: AuthUser(
        username: json['username'] as String? ?? '',
        displayName: json['displayName'] as String? ?? '',
      ),
      tokens: AuthTokens(
        accessToken: json['accessToken'] as String? ?? '',
        refreshToken: json['refreshToken'] as String? ?? '',
        expiresAt: DateTime.tryParse(json['expiresAt'] as String? ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0),
      ),
    );
  }
}
