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

#include "src/JniNotificationConfiguration.h"
#include "src/BlockChangeNotifier.h"
#include "catapult/extensions/ProcessBootstrapper.h"
#include "catapult/extensions/RootedService.h"

namespace catapult { namespace jninotification {

	namespace {
		void RegisterExtension(extensions::ProcessBootstrapper& bootstrapper) {
			// register subscriptions
			auto pVM = bootstrapper.extensionManager().javaVM();
			auto pJavaThread = bootstrapper.extensionManager().javaObject();
			auto blockChainConfig = bootstrapper.config().Blockchain;
			auto jniNotificationConfig = JniNotificationConfiguration::LoadFromPath(bootstrapper.resourcesPath());
			bootstrapper.subscriptionManager().addBlockChangeSubscriber(CreateBlockChangeNotifier(pVM, pJavaThread, blockChainConfig, jniNotificationConfig));
		}
	}
}}

extern "C" PLUGIN_API
void RegisterExtension(catapult::extensions::ProcessBootstrapper& bootstrapper) {
	catapult::jninotification::RegisterExtension(bootstrapper);
}
