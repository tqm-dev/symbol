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

#pragma once
#include <filesystem>
#include <string>

namespace catapult { namespace utils { class ConfigurationBag; } }

namespace catapult { namespace jninotification {

	/// JniNotification configuration settings.
	struct JniNotificationConfiguration {
	public:
		std::string NotifyMethodName;
		std::string NotifyMethodSig;
		std::string BlockViewClassPath;
		std::string BlockViewIdName;
		std::string BlockViewIdSig;
		std::string BlockViewHeightName;
		std::string BlockViewHeightSig;
		std::string BlockViewTimeStampName;
		std::string BlockViewTimeStampSig;
		std::string BlockViewDifficultyName;
		std::string BlockViewDifficultySig;
		std::string BlockViewFeeMultiplierName;
		std::string BlockViewFeeMultiplierSig;

	private:
		JniNotificationConfiguration() = default;

	public:
		/// Creates an uninitialized jninotification configuration.
		static JniNotificationConfiguration Uninitialized();

	public:
		/// Loads a jninotification configuration from \a bag.
		static JniNotificationConfiguration LoadFromBag(const utils::ConfigurationBag& bag);

		/// Loads a jninotification configuration from \a resourcesPath.
		static JniNotificationConfiguration LoadFromPath(const std::filesystem::path& resourcesPath);
	};
}}
