import '../../../core/constants/app_constants.dart';

class UserSettings {
  const UserSettings({
    required this.defaultDialPrefix,
    required this.showDialDisclaimer,
  });

  const UserSettings.defaults()
    : this(
        defaultDialPrefix: AppConstants.defaultDialPrefix,
        showDialDisclaimer: true,
      );

  final String defaultDialPrefix;
  final bool showDialDisclaimer;

  UserSettings copyWith({String? defaultDialPrefix, bool? showDialDisclaimer}) {
    return UserSettings(
      defaultDialPrefix: defaultDialPrefix ?? this.defaultDialPrefix,
      showDialDisclaimer: showDialDisclaimer ?? this.showDialDisclaimer,
    );
  }
}
