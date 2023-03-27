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

#include "catapult/utils/NetworkTime.h"
#include "BlockChangeNotifier.h"

namespace catapult { namespace jninotification {

	namespace {
		class BlockChangeNotifier final : public io::BlockChangeSubscriber {
		public:
			explicit BlockChangeNotifier(
					JavaVM* vm,
					jobject obj,
					const model::BlockchainConfiguration& blockchainConfig,
					const JniNotificationConfiguration& jniNotificationConfig)
				:m_vm(vm),
				 m_obj(obj),
				 m_blockchainConfig(blockchainConfig),
				 m_jniNotificationConfig(jniNotificationConfig)
			{
				JNIEnv* env = nullptr;
				m_vm->AttachCurrentThread(&env, nullptr);
				jclass cls = env->GetObjectClass(obj);
                m_classObserver = (jclass)env->NewGlobalRef(cls);
                cls = env->FindClass(m_jniNotificationConfig.BlockViewClassPath.c_str());
                m_classBlockView = (jclass)env->NewGlobalRef(cls);
            }

			~BlockChangeNotifier() override {
                JNIEnv* env = nullptr;
                m_vm->AttachCurrentThread(&env, nullptr);
                env->DeleteGlobalRef(m_classObserver);
                env->DeleteGlobalRef(m_classBlockView);
            }
		public:
			void notifyBlock(const model::BlockElement& blockElement) override {

                JNIEnv* env = nullptr;
                m_vm->AttachCurrentThread(&env, nullptr);

                jmethodID cns = env->GetMethodID(m_classBlockView, "<init>", "()V");
                jobject blockView = env->NewObject(m_classBlockView, cns);

				writeBlockView(env, blockView, blockElement.Block);

                jmethodID id = env->GetMethodID(m_classObserver,
												m_jniNotificationConfig.NotifyMethodName.c_str(),
												m_jniNotificationConfig.NotifyMethodSig.c_str());

                env->CallVoidMethod(m_obj, id, blockView);
                env->DeleteLocalRef(blockView);
			}

			void notifyDropBlocksAfter(Height height) override {
			}

		private:
			void writeBlockView(JNIEnv* env,
                                jobject obj,
                                const model::Block& block){
				// id
				env->SetIntField(obj,env->GetFieldID(m_classBlockView,
													 m_jniNotificationConfig.BlockViewIdName.c_str(),
													 m_jniNotificationConfig.BlockViewIdSig.c_str()),1); // CatapultEvent.NotifyBlock
				// height
                env->SetLongField(obj,env->GetFieldID(m_classBlockView,
													  m_jniNotificationConfig.BlockViewHeightName.c_str(),
													  m_jniNotificationConfig.BlockViewHeightSig.c_str()), (jlong)block.Height.unwrap());
				// timeStamp
				utils::NetworkTime networkTime(m_blockchainConfig.Network.EpochAdjustment);
				uint64_t utc = networkTime.toUnixTime(block.Timestamp).unwrap();
                env->SetLongField(obj,env->GetFieldID(m_classBlockView,
													  m_jniNotificationConfig.BlockViewTimeStampName.c_str(),
													  m_jniNotificationConfig.BlockViewTimeStampSig.c_str()), (jlong)utc);
				// difficulty
                env->SetLongField(obj,env->GetFieldID(m_classBlockView,
													  m_jniNotificationConfig.BlockViewDifficultyName.c_str(),
													  m_jniNotificationConfig.BlockViewDifficultySig.c_str()), (jlong)block.Difficulty.unwrap());
				// feeMultiplier
				env->SetIntField(obj, env->GetFieldID(m_classBlockView,
													  m_jniNotificationConfig.BlockViewFeeMultiplierName.c_str(),
													  m_jniNotificationConfig.BlockViewFeeMultiplierSig.c_str()), (jint)block.FeeMultiplier.unwrap());
			}

		private:
            JavaVM* m_vm;
			jobject m_obj;
			jclass  m_classObserver;
			jclass  m_classBlockView;
            model::BlockchainConfiguration m_blockchainConfig;
			JniNotificationConfiguration m_jniNotificationConfig;
		};
	}

	std::unique_ptr<io::BlockChangeSubscriber> CreateBlockChangeNotifier(
			JavaVM* vm,
			jobject obj,
			const model::BlockchainConfiguration& blockChainConfig,
			const JniNotificationConfiguration& jniNotificationConfig) {
		return std::make_unique<BlockChangeNotifier>(vm, obj, blockChainConfig, jniNotificationConfig);
	}
}}
