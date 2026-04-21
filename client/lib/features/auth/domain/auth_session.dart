import '../../../shared/utils/phone_utils.dart';

class AuthUser {
  const AuthUser({
    required this.phone,
    required this.displayPhone,
  });

  final String phone;
  final String displayPhone;

  AuthUser copyWith({
    String? phone,
    String? displayPhone,
  }) {
    return AuthUser(
      phone: phone ?? this.phone,
      displayPhone: displayPhone ?? this.displayPhone,
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
      'phone': user.phone,
      'displayPhone': user.displayPhone,
      'accessToken': tokens.accessToken,
      'refreshToken': tokens.refreshToken,
      'expiresAt': tokens.expiresAt.toIso8601String(),
    };
  }

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      user: AuthUser(
        phone: json['phone'] as String? ?? '',
        displayPhone: json['displayPhone'] as String? ??
            maskPhoneNumber(json['phone'] as String? ?? ''),
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
