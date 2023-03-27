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
#include "JniNotificationConfiguration.h"
#include "catapult/io/BlockChangeSubscriber.h"
#include "catapult/model/BlockchainConfiguration.h"
#include <jni.h>

namespace catapult { namespace jninotification {

	/// Creates a jniNotifier block storage.
	std::unique_ptr<io::BlockChangeSubscriber> CreateBlockChangeNotifier(
			JavaVM* vm,
			jobject obj,
			const model::BlockchainConfiguration& blockChainConfig,
			const JniNotificationConfiguration& jniNotificationConfig);
}}
