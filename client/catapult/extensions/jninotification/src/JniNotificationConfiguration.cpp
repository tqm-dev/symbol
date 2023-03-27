/**
*** Copyright (c) 2023, tqm.
*** All rights reserved.
***
*** This file is part of Catapult.
***
*** Catapult is free software: you can redistribute it and/or modify
*** it under the terms of the GNU Lesser General Public License as published by
*** the Free Software Foundation, either version 3 of the License, or
*** (at your option) any later version.
***
*** Catapult is distributed in the hope that it will be useful,
*** but WITHOUT ANY WARRANTY; without even the implied warranty of
*** MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
*** GNU Lesser General Public License for more details.
***
*** You should have received a copy of the GNU Lesser General Public License
*** along with Catapult. If not, see <http://www.gnu.org/licenses/>.
**/

#include "JniNotificationConfiguration.h"
#include "catapult/config/ConfigurationFileLoader.h"
#include "catapult/utils/ConfigurationBag.h"
#include "catapult/utils/ConfigurationUtils.h"

namespace catapult { namespace jninotification {

#define LOAD_PROPERTY(SECTION, NAME) utils::LoadIniProperty(bag, SECTION, #NAME, config.NAME)

	JniNotificationConfiguration JniNotificationConfiguration::Uninitialized() {
		return JniNotificationConfiguration();
	}

	JniNotificationConfiguration JniNotificationConfiguration::LoadFromBag(const utils::ConfigurationBag& bag) {
		JniNotificationConfiguration config;

#define LOAD_JNI_NOTIFICATION_PROPERTY(NAME) LOAD_PROPERTY("jninotification", NAME)

		LOAD_JNI_NOTIFICATION_PROPERTY(NotifyMethodName);
		LOAD_JNI_NOTIFICATION_PROPERTY(NotifyMethodSig);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewClassPath);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewIdName);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewIdSig);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewHeightName);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewHeightSig);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewTimeStampName);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewTimeStampSig);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewDifficultyName);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewDifficultySig);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewFeeMultiplierName);
		LOAD_JNI_NOTIFICATION_PROPERTY(BlockViewFeeMultiplierSig);

#undef LOAD_JNI_NOTIFICATION_PROPERTY

		utils::VerifyBagSizeExact(bag, 13);
		return config;
	}

#undef LOAD_PROPERTY

	JniNotificationConfiguration JniNotificationConfiguration::LoadFromPath(const std::filesystem::path& resourcesPath) {
		return config::LoadIniConfiguration<JniNotificationConfiguration>(resourcesPath / "config-jninotification.properties");
	}
}}
