/**
*** Copyright (c) 2016-present,
*** Jaguar0625, gimre, BloodyRookie, Tech Bureau, Corp. All rights reserved.
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

#include "BmPrivateKeyTree.h"
#include "catapult/crypto/SecureRandomGenerator.h"
#include "catapult/crypto/Signer.h"
#include "catapult/io/PodIoUtils.h"
#include "catapult/exceptions.h"
#include <type_traits>

namespace catapult { namespace crypto {

	namespace {
		using BmSignature = decltype(BmTreeSignature::Root.Signature);
		using BmPublicKey = decltype(BmTreeSignature::Root.ParentPublicKey);
		using BmPrivateKey = PrivateKey;
		using BmKeyPair = KeyPair;

		// region signed key pair

		BmPrivateKey GeneratePrivateKey() {
			SecureRandomGenerator generator;
			return BmPrivateKey::Generate([&generator]() { return static_cast<uint8_t>(generator()); });
		}

		BmPublicKey GetPublicKey(const BmPrivateKey& privateKey) {
			auto iter = privateKey.begin();
			auto keyPair = BmKeyPair::FromPrivate(BmPrivateKey::Generate([&iter]{
				return *iter++;
			}));
			return keyPair.publicKey();
		}

		RawBuffer ToBuffer(const uint64_t& value) {
			return { reinterpret_cast<const uint8_t*>(&value), sizeof(uint64_t) };
		}

		class SignedPrivateKey {
		public:
			static constexpr auto Entry_Size = sizeof(BmPrivateKey) + BmSignature::Size;

		public:
			SignedPrivateKey(BmPrivateKey&& privateKey, const BmSignature& signature)
					: m_keyPair(crypto::KeyPair::FromPrivate(std::move(privateKey)))
					, m_signature(signature)
			{}

		public:
			static SignedPrivateKey CreateRandom(const BmKeyPair& parentKeyPair, uint64_t identifier) {
				auto privateKey = GeneratePrivateKey();
				auto publicKey = GetPublicKey(privateKey);

				BmSignature signature;
				Sign(parentKeyPair, { publicKey, ToBuffer(identifier) }, signature);
				return SignedPrivateKey(std::move(privateKey), signature);
			}

		public:
			const BmKeyPair& keyPair() const {
				return m_keyPair;
			}

			const BmSignature& signature() const {
				return m_signature;
			}

			BmKeyPair&& detachKeyPair() {
				return std::move(m_keyPair);
			}

		private:
			BmKeyPair m_keyPair;
			BmSignature m_signature;
		};

		SignedPrivateKey ReadSignedPrivateKey(io::InputStream& input) {
			auto privateKey = BmPrivateKey::Generate([&input]() { return io::Read8(input); });
			BmSignature signature;
			input.read(signature);

			return SignedPrivateKey(std::move(privateKey), signature);
		}

		void Write(io::OutputStream& output, const SignedPrivateKey& signedPrivateKey) {
			output.write(signedPrivateKey.keyPair().privateKey());
			output.write(signedPrivateKey.signature());
		}

		void WipeSignedPrivateKey(io::OutputStream& output) {
			auto buffer = std::array<uint8_t, BmPrivateKey::Size>();
			output.write(buffer);
		}

		// endregion
	}

	// region level

	class BmPrivateKeyTree::Level {
	private:
		Level(
				const BmPublicKey& parentPublicKey,
				uint64_t startIdentifier,
				uint64_t endIdentifier,
				std::vector<SignedPrivateKey>&& signedPrivateKeys)
				: m_parentPublicKey(parentPublicKey)
				, m_startIdentifier(startIdentifier)
				, m_endIdentifier(endIdentifier)
				, m_levelSignedPrivateKeys(std::move(signedPrivateKeys))
		{}

	public:
		static Level FromStream(io::InputStream& input) {
			BmPublicKey parentPublicKey;
			input.read(parentPublicKey);
			auto startIdentifier = io::Read64(input);
			auto endIdentifier = io::Read64(input);

			std::vector<SignedPrivateKey> signedPrivateKeys;
			for (auto i = 0u; i <= endIdentifier - startIdentifier; ++i)
				signedPrivateKeys.push_back(ReadSignedPrivateKey(input));

			return Level(parentPublicKey, startIdentifier, endIdentifier, std::move(signedPrivateKeys));
		}

		static Level Create(BmKeyPair&& keyPair, uint64_t startIdentifier, uint64_t endIdentifier) {
			std::vector<SignedPrivateKey> signedPrivateKeys;
			for (auto i = 0u; i <= endIdentifier - startIdentifier; ++i)
				signedPrivateKeys.push_back(SignedPrivateKey::CreateRandom(keyPair, endIdentifier - i));

			return Level(keyPair.publicKey(), startIdentifier, endIdentifier, std::move(signedPrivateKeys));
		}

	public:
		const BmPublicKey& publicKey() const {
			return m_parentPublicKey;
		}

		uint64_t startIdentifier() const {
			return m_startIdentifier;
		}

		uint64_t endIdentifier() const {
			return m_endIdentifier;
		}

		size_t size() const {
			return m_levelSignedPrivateKeys.size();
		}

		BmTreeSignature::ParentPublicKeySignaturePair publicKeySignature(uint64_t identifier) const {
			auto index = m_endIdentifier - identifier;
			return { m_parentPublicKey, m_levelSignedPrivateKeys[index].signature() };
		}

		void wipe(uint64_t identifier) {
			auto newSize = std::min<size_t>(m_levelSignedPrivateKeys.size(), m_endIdentifier - identifier);
			while (m_levelSignedPrivateKeys.size() > newSize)
				m_levelSignedPrivateKeys.pop_back();
		}

		BmKeyPair detachKeyPairAt(uint64_t identifier) {
			auto index = m_endIdentifier - identifier;
			return m_levelSignedPrivateKeys[index].detachKeyPair();
		}

		const BmKeyPair& keyPairAt(uint64_t identifier) {
			auto index = m_endIdentifier - identifier;
			return m_levelSignedPrivateKeys[index].keyPair();
		}

		void write(io::OutputStream& output) const {
			output.write(m_parentPublicKey);
			io::Write64(output, m_startIdentifier);
			io::Write64(output, m_endIdentifier);

			for (const auto& signedPrivateKey : m_levelSignedPrivateKeys)
				Write(output, signedPrivateKey);
		}

	private:
		BmPublicKey m_parentPublicKey;
		uint64_t m_startIdentifier;
		uint64_t m_endIdentifier;
		std::vector<SignedPrivateKey> m_levelSignedPrivateKeys;
	};

	// endregion

	// region bm private key tree

	namespace {
		enum : size_t { Layer_Top, Layer_Low };

		constexpr auto Tree_Header_Size = sizeof(BmOptions) + 2 * sizeof(BmKeyIdentifier);
		constexpr auto Layer_Header_Size = BmPublicKey::Size + 2 * sizeof(uint64_t);

		uint64_t IndexToOffset(uint64_t index) {
			return Layer_Header_Size + index * SignedPrivateKey::Entry_Size;
		}

		BmKeyIdentifier LoadKeyIdentifier(io::InputStream& input) {
			BmKeyIdentifier keyIdentifier;
			keyIdentifier.BatchId = io::Read64(input);
			keyIdentifier.KeyId = io::Read64(input);
			return keyIdentifier;
		}

		BmOptions LoadOptions(io::InputStream& input) {
			BmOptions options;
			options.Dilution = io::Read64(input);
			options.StartKeyIdentifier = LoadKeyIdentifier(input);
			options.EndKeyIdentifier = LoadKeyIdentifier(input);
			return options;
		}

		void SaveKeyIdentifier(io::OutputStream& output, const BmKeyIdentifier& keyIdentifier) {
			io::Write64(output, keyIdentifier.BatchId);
			io::Write64(output, keyIdentifier.KeyId);
		}

		void SaveOptions(io::OutputStream& output, const BmOptions& options) {
			io::Write64(output, options.Dilution);
			SaveKeyIdentifier(output, options.StartKeyIdentifier);
			SaveKeyIdentifier(output, options.EndKeyIdentifier);
		}
	}

	BmPrivateKeyTree::BmPrivateKeyTree(io::SeekableStream& storage, const BmOptions& options)
			: m_storage(storage)
			, m_options(options)
			, m_lastKeyIdentifier({ BmKeyIdentifier::Invalid_Id, 0 })
			, m_lastWipeKeyIdentifier({ BmKeyIdentifier::Invalid_Id, 0 })
	{}

	BmPrivateKeyTree::BmPrivateKeyTree(BmPrivateKeyTree&&) = default;

	BmPrivateKeyTree BmPrivateKeyTree::FromStream(io::SeekableStream& storage) {
		auto options = LoadOptions(storage);
		BmPrivateKeyTree tree(storage, options);

		// FromStream loads whole level, used keys are zeroed
		tree.m_lastKeyIdentifier = LoadKeyIdentifier(storage);
		tree.m_lastWipeKeyIdentifier = LoadKeyIdentifier(storage);

		tree.m_levels[Layer_Top] = std::make_unique<Level>(Level::FromStream(storage));

		// if any sign() was issued prior to saving, load subsequent levels
		if (BmKeyIdentifier::Invalid_Id != tree.m_lastKeyIdentifier.BatchId)
			tree.m_levels[Layer_Low] = std::make_unique<Level>(Level::FromStream(storage));

		return tree;
	}

	BmPrivateKeyTree BmPrivateKeyTree::Create(BmKeyPair&& keyPair, io::SeekableStream& storage, const BmOptions& options) {
		BmPrivateKeyTree tree(storage, options);
		SaveOptions(tree.m_storage, tree.m_options);
		SaveKeyIdentifier(tree.m_storage, tree.m_lastKeyIdentifier);
		SaveKeyIdentifier(tree.m_storage, tree.m_lastWipeKeyIdentifier);
		tree.createLevel(Layer_Top, std::move(keyPair), options.StartKeyIdentifier.BatchId, options.EndKeyIdentifier.BatchId);
		return tree;
	}

	BmPrivateKeyTree::~BmPrivateKeyTree() = default;

	const BmPublicKey& BmPrivateKeyTree::rootPublicKey() const {
		return m_levels[Layer_Top]->publicKey();
	}

	const BmOptions& BmPrivateKeyTree::options() const {
		return m_options;
	}

	bool BmPrivateKeyTree::canSign(const BmKeyIdentifier& keyIdentifier) const {
		return check(keyIdentifier, m_lastKeyIdentifier);
	}

	BmTreeSignature BmPrivateKeyTree::sign(const BmKeyIdentifier& keyIdentifier, const RawBuffer& dataBuffer) {
		if (!canSign(keyIdentifier))
			CATAPULT_THROW_RUNTIME_ERROR_1("sign called with invalid key identifier", keyIdentifier);

		if (m_lastKeyIdentifier.BatchId != keyIdentifier.BatchId)
			createLevel(Layer_Low, m_levels[Layer_Top]->detachKeyPairAt(keyIdentifier.BatchId), 0, m_options.Dilution - 1);

		const auto& subKeyPair = m_levels[Layer_Low]->keyPairAt(keyIdentifier.KeyId);
		BmSignature msgSignature;
		Sign(subKeyPair, dataBuffer, msgSignature);

		m_lastKeyIdentifier = keyIdentifier;
		m_storage.seek(sizeof(BmOptions));
		SaveKeyIdentifier(m_storage, m_lastKeyIdentifier);

		return {
			m_levels[Layer_Top]->publicKeySignature(keyIdentifier.BatchId),
			m_levels[Layer_Low]->publicKeySignature(keyIdentifier.KeyId),
			{ subKeyPair.publicKey(), msgSignature }
		};
	}

	void BmPrivateKeyTree::wipe(const BmKeyIdentifier& keyIdentifier) {
		// allow KeyId to be invalid, indicating only batch keys should be wiped
		auto normalizedKeyId = BmKeyIdentifier::Invalid_Id == keyIdentifier.KeyId ? 0 : keyIdentifier.KeyId;
		if (!check({ keyIdentifier.BatchId, normalizedKeyId }, m_lastWipeKeyIdentifier))
			CATAPULT_THROW_RUNTIME_ERROR_1("wipe called with invalid key identifier", keyIdentifier);

		if (m_lastWipeKeyIdentifier.BatchId != keyIdentifier.BatchId)
			wipe(Layer_Top, keyIdentifier.BatchId);

		if (BmKeyIdentifier::Invalid_Id != keyIdentifier.KeyId)
			wipe(Layer_Low, keyIdentifier.KeyId);

		m_lastWipeKeyIdentifier = keyIdentifier;
	}

	bool BmPrivateKeyTree::check(const BmKeyIdentifier& keyIdentifier, const BmKeyIdentifier& referenceKeyIdentifier) const {
		if (keyIdentifier < referenceKeyIdentifier)
			return false;

		if (keyIdentifier < m_options.StartKeyIdentifier || keyIdentifier > m_options.EndKeyIdentifier)
			return false;

		if (keyIdentifier.KeyId >= m_options.Dilution)
			return false;

		return true;
	}

	size_t BmPrivateKeyTree::levelOffset(size_t depth) const {
		auto offset = Tree_Header_Size;
		for (size_t i = 0; i < depth; ++i)
			offset += IndexToOffset(m_levels[i]->endIdentifier() - m_levels[i]->startIdentifier() + 1);

		return offset;
	}

	void BmPrivateKeyTree::createLevel(size_t depth, BmKeyPair&& keyPair, uint64_t startIdentifier, uint64_t endIdentifier) {
		auto offset = levelOffset(depth);
		m_levels[depth] = std::make_unique<Level>(Level::Create(std::move(keyPair), startIdentifier, endIdentifier));

		m_storage.seek(offset);
		m_levels[depth]->write(m_storage);
	}

	void BmPrivateKeyTree::wipe(size_t depth, uint64_t identifier) {
		if (!m_levels[depth])
			return;

		// wipe keys from storage
		auto& level = *m_levels[depth];
		auto levelStartOffset = levelOffset(depth);
		auto index = level.endIdentifier() - identifier;
		for (auto i = index + 1; i < level.size(); ++i) {
			m_storage.seek(levelStartOffset + IndexToOffset(i));
			WipeSignedPrivateKey(m_storage);
		}

		// wipe from memory
		level.wipe(identifier);

		// wipe requested key from storage
		m_storage.seek(levelStartOffset + IndexToOffset(index));
		WipeSignedPrivateKey(m_storage);
	}

	// endregion

	// region Verify

	namespace {
		bool VerifyBoundSignature(
				const BmTreeSignature::ParentPublicKeySignaturePair& pair,
				const BmPublicKey& signedPublicKey,
				uint64_t boundary) {
			return crypto::Verify(pair.ParentPublicKey, { signedPublicKey, ToBuffer(boundary) }, pair.Signature);
		}
	}

	bool Verify(const BmTreeSignature& signature, const BmKeyIdentifier& keyIdentifier, const RawBuffer& buffer) {
		if (!VerifyBoundSignature(signature.Root, signature.Top.ParentPublicKey, keyIdentifier.BatchId))
			return false;

		if (!VerifyBoundSignature(signature.Top, signature.Bottom.ParentPublicKey, keyIdentifier.KeyId))
			return false;

		if (!crypto::Verify(signature.Bottom.ParentPublicKey, buffer, signature.Bottom.Signature))
			return false;

		return true;
	}

	// endregion
}}
