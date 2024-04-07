import { Hash256 } from '../../src/CryptoTypes.js';
import {
	/* eslint-disable no-unused-vars */
	BranchNode,
	LeafNode,
	/* eslint-enable no-unused-vars */
	MerkleHashBuilder,
	PatriciaMerkleProofResult,
	deserializePatriciaTreeNodes,
	proveMerkle,
	provePatriciaMerkle
} from '../../src/symbol/merkle.js';
import { hexToUint8 } from '../../src/utils/converter.js';
import { expect } from 'chai';
import crypto from 'crypto';

describe('merkle', () => {
	// region MerkleHashBuilder

	describe('MerkleHashBuilder', () => {
		const calculateMerkleHash = seedHashes => {
			const builder = new MerkleHashBuilder();
			seedHashes.forEach(seedHash => { builder.update(seedHash); });
			return builder.final();
		};

		it('can build from zero hashes', () => {
			// Act:
			const merkleHash = calculateMerkleHash([]);

			// Assert:
			expect(merkleHash).to.deep.equal(Hash256.zero());
		});

		it('can build from one hash', () => {
			// Arrange:
			const seedHash = new Hash256(crypto.randomBytes(Hash256.SIZE));

			// Act:
			const merkleHash = calculateMerkleHash([seedHash]);

			// Assert:
			expect(merkleHash).to.deep.equal(seedHash);
		});

		it('can build from balanced tree', () => {
			// Act:
			const merkleHash = calculateMerkleHash([
				new Hash256('36C8213162CDBC78767CF43D4E06DDBE0D3367B6CEAEAEB577A50E2052441BC8'),
				new Hash256('8A316E48F35CDADD3F827663F7535E840289A16A43E7134B053A86773E474C28'),
				new Hash256('6D80E71F00DFB73B358B772AD453AEB652AE347D3E098AE269005A88DA0B84A7'),
				new Hash256('2AE2CA59B5BB29721BFB79FE113929B6E52891CAA29CBF562EBEDC46903FF681'),
				new Hash256('421D6B68A6DF8BB1D5C9ACF7ED44515E77945D42A491BECE68DA009B551EE6CE'),
				new Hash256('7A1711AF5C402CFEFF87F6DA4B9C738100A7AC3EDAD38D698DF36CA3FE883480'),
				new Hash256('1E6516B2CC617E919FAE0CF8472BEB2BFF598F19C7A7A7DC260BC6715382822C'),
				new Hash256('410330530D04A277A7C96C1E4F34184FDEB0FFDA63563EFD796C404D7A6E5A20')
			]);

			// Assert:
			expect(merkleHash).to.deep.equal(new Hash256('7D853079F5F9EE30BDAE49C4956AF20CDF989647AFE971C069AC263DA1FFDF7E'));
		});

		it('can build from unbalanced tree', () => {
			// Act:
			const merkleHash = calculateMerkleHash([
				new Hash256('36C8213162CDBC78767CF43D4E06DDBE0D3367B6CEAEAEB577A50E2052441BC8'),
				new Hash256('8A316E48F35CDADD3F827663F7535E840289A16A43E7134B053A86773E474C28'),
				new Hash256('6D80E71F00DFB73B358B772AD453AEB652AE347D3E098AE269005A88DA0B84A7'),
				new Hash256('2AE2CA59B5BB29721BFB79FE113929B6E52891CAA29CBF562EBEDC46903FF681'),
				new Hash256('421D6B68A6DF8BB1D5C9ACF7ED44515E77945D42A491BECE68DA009B551EE6CE')
			]);

			// Assert:
			expect(merkleHash).to.deep.equal(new Hash256('DEFB4BF7ACF2145500087A02C88F8D1FCF27B8DEF4E0FDABE09413D87A3F0D09'));
		});

		it('produces different merkle hash when sub hash order changes', () => {
			// Arrange:
			const seedHashes1 = Array.from({ length: 8 }, () => new Hash256(crypto.randomBytes(Hash256.SIZE)));
			const seedHashes2 = Array.from([0, 1, 2, 5, 4, 3, 6, 7], value => seedHashes1[value]);

			// Sanity:
			expect(seedHashes2.length).to.equal(seedHashes1.length);

			// Act:
			const merkleHash1 = calculateMerkleHash(seedHashes1);
			const merkleHash2 = calculateMerkleHash(seedHashes2);

			// Assert:
			expect(merkleHash2).to.not.deep.equal(merkleHash1);
		});

		it('produces different merkle hash when sub hash changes', () => {
			// Arrange:
			const seedHashes1 = Array.from({ length: 8 }, () => new Hash256(crypto.randomBytes(Hash256.SIZE)));
			const seedHashes2 = Array.from(
				[0, 1, 2, 3, -1, 5, 6, 7],
				value => (0 <= value ? seedHashes1[value] : new Hash256(crypto.randomBytes(Hash256.SIZE)))
			);

			// Act:
			const merkleHash1 = calculateMerkleHash(seedHashes1);
			const merkleHash2 = calculateMerkleHash(seedHashes2);

			// Assert:
			expect(merkleHash2).to.not.deep.equal(merkleHash1);
		});
	});

	// endregion

	// region proveMerkle

	describe('proveMerkle', () => {
		it('succeeds when leaf is root and there is no path', () => {
			// Arrange:
			const rootHash = new Hash256('36C8213162CDBC78767CF43D4E06DDBE0D3367B6CEAEAEB577A50E2052441BC8');

			// Act:
			const result = proveMerkle(rootHash, [], rootHash);

			// Assert:
			expect(result).to.equal(true);
		});

		it('fails when leaf is root and there is path', () => {
			// Arrange:
			const rootHash = new Hash256('36C8213162CDBC78767CF43D4E06DDBE0D3367B6CEAEAEB577A50E2052441BC8');
			const merklePath = [
				{ hash: new Hash256('6D80E71F00DFB73B358B772AD453AEB652AE347D3E098AE269005A88DA0B84A7'), isLeft: true }
			];

			// Act:
			const result = proveMerkle(rootHash, merklePath, rootHash);

			// Assert:
			expect(result).to.equal(false);
		});

		const createDefaultTestVector = () => ({
			leafHash: new Hash256('D4713ABB76AC98FB74AB91607C9029A95821C28462DC43707D92DD35E10B96CD'),
			merklePath: [
				{ hash: new Hash256('2CFB84D7A2F53FFAE07B1A686D84CB2491AD234F785B9C5905F1FF04E921F3F7'), isLeft: false },
				{ hash: new Hash256('B49544CFA100301340F7F060C935B02687041431BC660E288176B1954D5DF5D0'), isLeft: false },
				{ hash: new Hash256('0C346E96C61C4E54BCC10F1A4604C30C4A6D1E51691385BFFF2B9E56B2E0A9EB'), isLeft: false },
				{ hash: new Hash256('399887ED3F5C3086A1DFF78B78697C1592E2C35C10FB45B5AAF621AB52D23B78'), isLeft: true },
				{ hash: new Hash256('55DFB13E3F549DA89E9C38C97E7D2A557EE9B660EDA10DBD2088FB4CAFEF2524'), isLeft: false },
				{ hash: new Hash256('190C27BF7B21C474E99E3FE0F3DBF437F33C784D80732C2F8263D3F6A0167C58'), isLeft: false },
				{ hash: new Hash256('0B7DC05FA282E3BB156EE2861DF7E456AF538D56B4452996C39B4F5E46E2233E'), isLeft: false },
				{ hash: new Hash256('60E4C788A881D84AFEA758C660E9C779A460F022AE3EC38D584155F08E84D82E'), isLeft: true }
			],
			rootHash: new Hash256('DDDBA0604EE6A2CB9825CA5E0D31785F05F43713C5E7C512A900A7287DB5143C')
		});

		it('succeeds when proof is valid', () => {
			// Arrange:
			const testVector = createDefaultTestVector();

			// Act:
			const result = proveMerkle(testVector.leafHash, testVector.merklePath, testVector.rootHash);

			// Assert:
			expect(result).to.equal(true);
		});

		it('fails when root does not match', () => {
			// Arrange:
			const testVector = createDefaultTestVector();
			testVector.rootHash.bytes[0] ^= 0xFF;

			// Act:
			const result = proveMerkle(testVector.leafHash, testVector.merklePath, testVector.rootHash);

			// Assert:
			expect(result).to.equal(false);
		});

		it('fails when branch position is wrong', () => {
			// Arrange:
			const testVector = createDefaultTestVector();
			testVector.merklePath[4].isLeft = !testVector.merklePath[4].isLeft;

			// Act:
			const result = proveMerkle(testVector.leafHash, testVector.merklePath, testVector.rootHash);

			// Assert:
			expect(result).to.equal(false);
		});
	});

	// endregion

	// region deserializePatriciaTreeNodes

	// contains at least one node in positive path with even length
	const POSITIVE_PROOF_SERIALIZED_PATH = ''
		+ '0000FFFFAFDADBDB47CFB13C209B9B985C57AD29F9B915C791D7D0828E9274119A77958D53E3844F20FBC889A50036744AABDA826076E5379FC61D0C9BE7AA58'
		+ 'B0F14729A7FDA6770B21D1CAE4B8C5543229ACC81511DD60E48C975508C741DD8C9B54947815CB59BC5F699AF7458430E4FF739A7097A0400AE9E6360F29E2D6'
		+ 'C37E55B8B3FC1F206624E25A33A71B1E9F646D7FAD46B43DA110C3A144AF8E6A1ACE853D9F3A36B35BD0AC822FAF9C3020DEF39C371A78A6E81816ABF1BC4154'
		+ '9899251A90C0321C7CB88A30F5D17E82D7B2ED1C434CD590FD51F7F3D10C0CE9B185841AD45DD26D20862EE0E9A40DE67B877539390C93FB0AC6143B3C5D83CD'
		+ 'E34FAE2BF38458A6C69EA53851F6FD603DE34978B003CE86C83A5B6A622D92A10E1BF47B04995C5B02F93AFE3DEDFA1E5809FBE99A9EDF6E8090F123693E1FB4'
		+ 'E06ECF28F41CC6694B11078C11C69E57C38A9DC990C9E2DE2633D584752BD4AB8F99ACF096B9FF9BA6B3527F994AB8FE7519A0E09A35586F33593F4989EF8E49'
		+ '8C19540E6C39CC098011030B8D8A893D50B81F8B840A0B9B1BB4DAD4B69ABD71233917EC0C5FA3DDF07B3FF84565A162CDDF727A179566BAD98C5404E42874AA'
		+ '1A49C2DAB9AE0B13FFAF87E243795B252C261539C5A71A8B08E475F717CE855094520202FB08AE30471CBF390B22BE1914ACD28E9502DA945F79CBA5CD911C08'
		+ '9FCE9DDC0000FFFFCC02F2424F525D54D62F6D9CF1661948ECEE58C28035CA33D21DA71134CF3FD62535E12C2413634220A0F1F8EAD7E286D127D887B2DE7660'
		+ '97DBD9C8A593663FA4035E8B2C7E84FE68F50E133068F26BC200ECD8D6FD8F7E87566FE89C64BACE907B7B8E71D1D0685CF3757AEE078B4DF9583A3D68F4A6E1'
		+ '1B5979EE6B47E721C2BE6008D0EFA2421465F2C73B9E06DF14188EE68EF18C7106BC8939F343B27145BDE0C67B4921416888F64E77CAC136F1A94A6A7200B6D0'
		+ '3A475B6D19369899A7173E279D549B24EE60E0DFE6FC270660AAB37F50E01F2AE9A1D8A738BB624546A229B981BD2624101CC1C1E57BF1E78D806C3C7D7CE355'
		+ '0705733E53FA59BF960051EAED1CCCCE054D3BB71572798E16867D3F9187101DE5DDEFD39CC22D2C7E6E73A9AB34E1894CE02DB8B6700621D5C7509564E8BDCE'
		+ '8E6AA2F2C5EC4E97C3BF82F0593A581C98A67FBF5CB0CF6652BCB2B1A0964C2D553F5801E49CA9266F39F85454E68D3568D819D2EF0F2256A84C36A685B8FBD5'
		+ '49B1A2A85B829A0C17A0AA71918DF81763F0A0C670143BF84ECA67DF8B63712C6327B95CF5638C8531BD944619B9676A89F207B543E82E8F6809008F06B20EBF'
		+ 'D8AF9CFD5B1617FDB7EFD09E1B7C2170C85F82D4A27C3830CBFAD141CB9823CB3C178B9FA2842A664F0D6BE385E25E4D8B3E6564E58B6A4DB5D14A6A73576C48'
		+ 'FE5F6CFC7E6202F70000FFFFB27F0E8FD33C71829C90320D530079154C55BE9446BB5940D91E78FCC9CDB5849859A123FCF89E9D9D9053530043791776512CC3'
		+ 'F355CE2CCDD3105D02861F546E567A36755E0B7DD5B5524F7532DB969A7243A7241FEB444CCC41FF98ACC28F2AB90F119AAB509E29DA6AEDDB7F40CAA5F7DD85'
		+ '9F3F783EEA72DB7473B59A4EEDBEC9F524726BDA487C588D477AF8A7A61AFBC8895D272C9823C512931476EEDAB4900E9AA1E561CBD215982F69022779A87384'
		+ '28BA31538173C41D2E69F1194EB81B334CEB3AC72B16597DBF45C226C86EB8FD18F9C7F03A7374089B7BB7AE5306F55E302CAF4DE87DB69E359105D68DDD5FFD'
		+ 'C0D41A7D9E6CD123544227A1180DBFCF9B96913B67596692688236DBCD987A43289B970AC3B2269F4601F4412F645631CFCCF72454438223AAEB238FB5037CCF'
		+ 'BAC0EA1A15C03A417C933AAB7B57723B8D87CE2691641E9357EF007B235672B4D063727620C3A272058F9B13F5F8697CE4B9412BBAD7CA1BD2D22A29624C8664'
		+ '1F93380A96C8CCA1B3E32FBF15D32D80B4CD17457129F8EAAFB16132B63615F316574CA0B8834BAC35D35F55386B7F24CE8E9B6E08E5BF7E50D17DBA7428ED0D'
		+ '867602C5069E3C71B79961A4C66CCEC8CFF624D5039AAEA1162E02FC6D65A25A47E678A8089EE2C1D9EAA86501575B25949248723621E2A9BDBDE054BBC5A7D5'
		+ 'D61AB2C7BD352083BAADE6D900002615541A465385264D8C8AF8F16946B1FCFF37F5131E3F710119699D65587C39D5F20DB344B8A1DD95EB3DB12C1BC150EE66'
		+ '57A8F440F8ADC6BEF724519D4403A58B5EC30C0C07151672EC8A9234FC12BE35F69B07CC4E69896E2D003905611E21268E321E29839084810B0CD552497357ED'
		+ '73D07C200E09F338EBAA7053954D40E1130B276733332C7CA5D059202F352FE4887D381301573A4789C622C29B4B4DE488CEB3B43A69784787E791D703FF61D7'
		+ 'C9EBE0F70719650F94BD39DD6D941C63FF3CFD50029F6E1DEFD128D221EEACC5E1796E1AAA9C247204019CEFE3CA050E6B432C8195128DECD95437418EDE7F36'
		+ '59EA83DB12E49DE3D320E8E267D585BB';

	// contains at least one node in positive path with odd length
	const POSITIVE_PROOF_SERIALIZED_PATH_ODD = ''
		+ '0000FFFFD288F96EACFB6A5F6161105ECE4BE70EA8B31FF489D74FB75F4CD4D441512F3BE62A81D495B6E8C147A0DA2D6C0C2C5249E3EB3F1722BD32C6238D98'
		+ '511E3497C105F969D65E428DAA9CC285F86C39ADCC0CB4EBEBDB9750FE66AC785AB4516F997FAC2CC412C4A359241955390E02DF648D39EE8121578AC192F465'
		+ 'C9EC1D417ECF8B0626F55B1542384678CB88B81DD478284B44EDDC64A8BF7F9A0124347A936522750ADE300A60597378E45D7E5CCF588F4CA446342E45BFE621'
		+ 'F5AB154894AE7C188BB234CF23BCC3DDA93585278A0DA7C461D69B373B874E60A7B2C398DA3D2709D682FD705E1FD1ACA080B4F0E0DD93E2E96ADF3558D77A52'
		+ 'A867A67623E994688BC9F98E07553BE36DC80F4FE9EC5280E1A2EE9A9CF70D81E5D5E1E39E0E5952D0B44414211E532751915031A7D6183957D25B7ABB642515'
		+ '9112A9CF300C3DFF40B276823E961BAFB2B82EB0332A3BBE16B9EC62391FC33D6B19FB73B8D94CC61B5CC0597736F38A8DA6AA3E6FE603E33FCC6FF39414C211'
		+ '4E077B441ABC322B44EAC7DD52E3583D06E24B5D1F08419BBC0FFC20C7A51753563F9A4B735E437E7D045EAEE047B80505494CACB15077F1CB0139297DF9768E'
		+ 'A5850FC5512DFF60A3BF74B1A4001F689EFD291ABF01FBC1E48DF54967E5DD95E93BED0D5C676A252A99DC92BD9A6ACA71A17F2A8AD998AA9C6DC1453BA4D0AE'
		+ '149C29890000FFFFB3984E669FF615D7D662364B23E6BA39053059A4CC8CF6002C7EE7153C37BA87E70B3203AE1A7C855A1E9B05EBB0938457FF2890A6176A48'
		+ '459D8E88D8F1AABC21C955342030B94AE67C7729D7C68B8BC7638E38B60FB95E277BD643D4B2653F54B4FEEDDC357B8B5E0C11CE672248AC19240962213E7684'
		+ '826665B6B457E89CC0D107731523477333D89796BAC931DBFC56AB3F728F052E7385337C6008EEBAD104DA605A9266F7B507B01F928C55F27461AA0C09950EE0'
		+ '33C774D507F9125C22DF50148AC6FA974B0E7B6F475A9846A38AF4FD86280D5C8074535B0D3172843B397CA37303A2B37C43F576A5B97CD530F0CFBEA83143A7'
		+ '86CD490AE8DBD03AA2DBB8F55D8887530ECC6CA9C752A9994D52FA11A35D771C69238DB6CDA3F56C95A1E7E21197AE9E90E30C5F2B1559769E407F97448BFAC1'
		+ '34943B3345CA90F561F7C1393209E53D38189D28CD3A9C6D4325647F7D1D810994EE9CF1DB90718F5C85BEB2AAE3E153FA121AF5AD010442BFE73CFC44B83EE0'
		+ '754FCE1024176B44463F2894769562764F93B3AB97DCEA126DFA156BB3265594607B491F5350B2E07F0707579D9C82D31D043795380C1990FC9B1BA7AD8B8337'
		+ 'C3060B0905E769754C91BBD6BCDD65983CBF663F78992828234B5B268A05EC6B3C9CB886C323DB347EC38039640F56702BA987D9C4EFEA10DF218F181EABA258'
		+ '722BC29C71D0C58B00007140A3258AD1BBBC670D79B4349548F74499FC821E42281D769F2E5E3CAF61EE55ACDABE94628AFAC26C029C544A78FDC4649E26E2E2'
		+ 'C6B61972B28DCE1974379B23F53B2835F91A072B773F0C3F7DC7849C68A4F1B39DD1B09FE6C1A03A27059B8A604D50E4F3D6EF59060BF5537501E426C34F76B2'
		+ '7BC7EEA52FD20DE60C3E6D979CA9D16424DB09215F63B4B726B2025574EC633B49FF8EA0D5168E940A42710BFF3DC540D7E6C7DF3E924E9F1B7D468FF771301A'
		+ 'F00B0476E2B7E511379BB559E0DDB3F0E64DA7BC2263C992D6FF7D12A4D4B8728F637777A70029EB5DB41B26D8';

	const NEGATIVE_PROOF_SERIALIZED_PATH = ''
		+ '0000FFFFAFDADBDB47CFB13C209B9B985C57AD29F9B915C791D7D0828E9274119A77958D53E3844F20FBC889A50036744AABDA826076E5379FC61D0C9BE7AA58'
		+ 'B0F14729A7FDA6770B21D1CAE4B8C5543229ACC81511DD60E48C975508C741DD8C9B54947815CB59BC5F699AF7458430E4FF739A7097A0400AE9E6360F29E2D6'
		+ 'C37E55B8B3FC1F206624E25A33A71B1E9F646D7FAD46B43DA110C3A144AF8E6A1ACE853D9F3A36B35BD0AC822FAF9C3020DEF39C371A78A6E81816ABF1BC4154'
		+ '9899251A90C0321C7CB88A30F5D17E82D7B2ED1C434CD590FD51F7F3D10C0CE9B185841AD45DD26D20862EE0E9A40DE67B877539390C93FB0AC6143B3C5D83CD'
		+ 'E34FAE2BF38458A6C69EA53851F6FD603DE34978B003CE86C83A5B6A622D92A10E1BF47B04995C5B02F93AFE3DEDFA1E5809FBE99A9EDF6E8090F123693E1FB4'
		+ 'E06ECF28F41CC6694B11078C11C69E57C38A9DC990C9E2DE2633D584752BD4AB8F99ACF096B9FF9BA6B3527F994AB8FE7519A0E09A35586F33593F4989EF8E49'
		+ '8C19540E6C39CC098011030B8D8A893D50B81F8B840A0B9B1BB4DAD4B69ABD71233917EC0C5FA3DDF07B3FF84565A162CDDF727A179566BAD98C5404E42874AA'
		+ '1A49C2DAB9AE0B13FFAF87E243795B252C261539C5A71A8B08E475F717CE855094520202FB08AE30471CBF390B22BE1914ACD28E9502DA945F79CBA5CD911C08'
		+ '9FCE9DDC0000FFFF42F163E3BAEA7BA965CB34F04A4BED561EEEF541B2304B0737A4A5FB8D610B1516AD75DC2EF9C6F69553AF4B46DBD91F3311391CA1FE468B'
		+ 'A00D94654A91B5D321C7AD4AD3ED73516D8FAE30142E720E951C826343DB475560C82CEA4674D36217B2534D077375D6F936F2EA27A162E0C6338422816A9D62'
		+ '63DEC2D6955C659D05DFF1DD72AB18CC9CA5D76599757858C6E19DABE2A0C665E83ACCE777FC916D4EEC22C50204DCD42CBE9A22DD974A7559985A0BAFDCDBFB'
		+ '5E55AE9B9BEBA181CAA643309F566C85F0A18B9BA735C8EDD4D2E8E3832D42A4F9601EE3B8F30AD1EECDAE72F71A9561C4D135029CF6EEE6BFC3C7F2872676C0'
		+ 'A9DF64A09FCA64F414CFE8BCD7D84AE14801596CF350116A764DC34D8EA2F2C2D98D073406181FEDC93AA3D20DE953EEAD6BF3C37F5B15D5DB82E166B80630A9'
		+ '8AF7888784CBDF97E99FAE3AC81F83A9F605F71E601D47D9BBDB92F2EA90ACC2C18CE711C5B2B7A3DD5DF1EF7598A3083B94286A98BAB1F493629318BF8625B6'
		+ 'FDD112C385927C1D9DF8C09DDC0AAF553366CE873F4DE5E9A2E372F335E6B1E32041460DDE99682F791F8FDF408B7CE7E8C8AF0DBE2C1D23668D5AB9DB780F8E'
		+ 'B4D2D90DAA3E8077463F6564683E3F6AAFF873898A27B27D3DBA5B03BAF005FEEE0DA0E17C4E846906EAA3689422D6A7EB4586040F373E010E54BE6C546CC304'
		+ '6CF6EBA91544D0180000FFFFD4C3868CE0595FB9AFCF0943FF0E8D94C9E69A8D9FAA7599DC49DAD021F59B073F7600938C242FDB5478D19FF243124B1B77531B'
		+ '91D0C925AD9C53E9DBA8AC364A1A31E06E5EE51475DF6CB760BDAF7279B8E47ED1E42E884F842325091713CF8685B071704B8559ED7CB81B75DA4FEAB364FD5C'
		+ '9B9074E13AC181EFDF76B2F5567A07FD3945C3158C4FA5EB61D62B6B2CD93A3EC8D735376332DD95085926011E7BC92187C1673146EEA06354D951508D975E60'
		+ '1E51BE6E518D65F52E4EBA6DD8B12E361A3FB36C2AABA10A50A0101B21C8B88771D9C29B7C3953A7DF2882D3C90818A181D11751402857951CCBE4DF136B8452'
		+ '218C87E47833A80C49A45E57A182F3B273E1685329F2971C168D9F414752AB582F8099670FAA1DBC2C729A847C9F427A3E60D0FE871BB058BE4D64B600FFE392'
		+ 'BE9BACEF41EECFA2E5B487F086E4036996D863064CED1272DDF49ECB6696F2949E58B39E64BF3FA5CA9597C24B3BDA8364415F1AE30450530115A9CBC832DFBA'
		+ 'B297ED24F9ED72C674A3B0FA988734FFA917A3CF46E288C46B2D7D73BFD8058FDC523DB1D85B240CD7F76336E6D84A3D71F2116185A205D9D7CCA9F59A5B6EF5'
		+ '6C8D5271F3C3DF03511713414CD4EF0746C50A676E8EE84AAB8D9E57BC4C07DC8B22BFDFF7B40E3ED5C6FB650788F4A9CDB34254ACE86B997091B26226A64574'
		+ '61E663C0CDAF8F7D880423FF00000512F0B44C86250B5FF5EFC2646FA16E93CF47079031FC3A1A3DEB65996EE379071CE3D5E65A7A7D6103A1F2772D1C240E29'
		+ '6BEBF21D31F1208D22F1E55EED2B2754DD8B2D11493E55967EB24304A10A9BD1F81B1668CD2F81CF5EAD687A92D4FF0D73BDD53DF3DCE0F12962B53D98DB35FA'
		+ '70501DB7E71B684AD7FB0C30517C6FBF';

	describe('deserializePatriciaTreeNodes', () => {
		const ENCODED_EVEN_PATH = '3CFD50029F6E1DEFD128D221EEACC5E1796E1AAA9C247204019CEFE3CA050E';
		const ENCODED_ODD_PATH = '3D93E37E8616665E4E5DA0CAF388172AB754CEE17FE702019228A996084F6E70';

		const ENCODED_BRANCH_LINKS = '2615'
			+ '541A465385264D8C8AF8F16946B1FCFF37F5131E3F710119699D65587C39D5F2'
			+ '0DB344B8A1DD95EB3DB12C1BC150EE6657A8F440F8ADC6BEF724519D4403A58B'
			+ '5EC30C0C07151672EC8A9234FC12BE35F69B07CC4E69896E2D003905611E2126'
			+ '9DE0488DD979C15D1150FB5B2C87E64DC6E07A935EEDBC1850D21EBBE59DE0C8'
			+ '130B276733332C7CA5D059202F352FE4887D381301573A4789C622C29B4B4DE4'
			+ '88CEB3B43A69784787E791D703FF61D7C9EBE0F70719650F94BD39DD6D941C63';

		it('can deserialize leaf with even path', () => {
			// Arrange:
			const buffer = hexToUint8(`FF${ENCODED_EVEN_PATH}3A50C5BF83CBA3370CF4E4AC0FC5A6FFB0E29501F66DA12DE25FFB13A419BA77`);

			// Act:
			const nodes = /** @type {Array<LeafNode>} */ (deserializePatriciaTreeNodes(buffer));

			// Assert:
			expect(nodes.length).to.equal(1);
			expect(nodes[0].path.path).to.deep.equal(hexToUint8('FD50029F6E1DEFD128D221EEACC5E1796E1AAA9C247204019CEFE3CA050E'));
			expect(nodes[0].path.size).to.equal(60);
			expect(nodes[0].hexPath).to.equal('FD50029F6E1DEFD128D221EEACC5E1796E1AAA9C247204019CEFE3CA050E');
			expect(nodes[0].value).to.deep.equal(new Hash256('3A50C5BF83CBA3370CF4E4AC0FC5A6FFB0E29501F66DA12DE25FFB13A419BA77'));
			expect(nodes[0].calculateHash()).to.deep.equal(new Hash256('9DE0488DD979C15D1150FB5B2C87E64DC6E07A935EEDBC1850D21EBBE59DE0C8'));
		});

		it('can deserialize leaf with odd path', () => {
			// Arrange:
			const buffer = hexToUint8(`FF${ENCODED_ODD_PATH}F48F12376B7C72F97E1533DE6DDB6F957DAB4F9031F959261AA2C5B655C864AA`);

			// Act:
			const nodes = /** @type {Array<LeafNode>} */ (deserializePatriciaTreeNodes(buffer));

			// Assert:
			expect(nodes.length).to.equal(1);
			expect(nodes[0].path.path).to.deep.equal(hexToUint8('93E37E8616665E4E5DA0CAF388172AB754CEE17FE702019228A996084F6E70'));
			expect(nodes[0].path.size).to.equal(61);
			expect(nodes[0].hexPath).to.equal('93E37E8616665E4E5DA0CAF388172AB754CEE17FE702019228A996084F6E7');
			expect(nodes[0].value).to.deep.equal(new Hash256('F48F12376B7C72F97E1533DE6DDB6F957DAB4F9031F959261AA2C5B655C864AA'));
			expect(nodes[0].calculateHash()).to.deep.equal(new Hash256('89C46989937A631F9D5DE7936EAC12CA5924E37DE3336F2B158CFAC7AC377F60'));
		});

		const assertDefaultBranchLinks = links => {
			expect(links).to.deep.equal([
				undefined,
				new Hash256('541A465385264D8C8AF8F16946B1FCFF37F5131E3F710119699D65587C39D5F2'),
				new Hash256('0DB344B8A1DD95EB3DB12C1BC150EE6657A8F440F8ADC6BEF724519D4403A58B'),
				undefined,
				undefined,
				new Hash256('5EC30C0C07151672EC8A9234FC12BE35F69B07CC4E69896E2D003905611E2126'),
				undefined,
				undefined,
				new Hash256('9DE0488DD979C15D1150FB5B2C87E64DC6E07A935EEDBC1850D21EBBE59DE0C8'),
				undefined,
				new Hash256('130B276733332C7CA5D059202F352FE4887D381301573A4789C622C29B4B4DE4'),
				undefined,
				new Hash256('88CEB3B43A69784787E791D703FF61D7C9EBE0F70719650F94BD39DD6D941C63'),
				undefined,
				undefined,
				undefined
			]);
		};

		it('can deserialize branch with no path', () => {
			// Arrange:
			const buffer = hexToUint8(`0000${ENCODED_BRANCH_LINKS}`);

			// Act:
			const nodes = /** @type {Array<BranchNode>} */ (deserializePatriciaTreeNodes(buffer));

			// Assert:
			expect(nodes.length).to.equal(1);
			expect(nodes[0].path.path).to.deep.equal(new Uint8Array());
			expect(nodes[0].path.size).to.equal(0);
			expect(nodes[0].hexPath).to.equal('');
			assertDefaultBranchLinks(nodes[0].links);
			expect(nodes[0].calculateHash()).to.deep.equal(new Hash256('57E684CC77BECEF30EAD8C81EC812374AB3FF6DB82E0842DFA6DA2AC7C897DEF'));
		});

		it('can deserialize branch with even path', () => {
			// Arrange:
			const buffer = hexToUint8(`00${ENCODED_EVEN_PATH}${ENCODED_BRANCH_LINKS}`);

			// Act:
			const nodes = /** @type {Array<BranchNode>} */ (deserializePatriciaTreeNodes(buffer));

			// Assert:
			expect(nodes.length).to.equal(1);
			expect(nodes[0].path.path).to.deep.equal(hexToUint8('FD50029F6E1DEFD128D221EEACC5E1796E1AAA9C247204019CEFE3CA050E'));
			expect(nodes[0].path.size).to.equal(60);
			expect(nodes[0].hexPath).to.equal('FD50029F6E1DEFD128D221EEACC5E1796E1AAA9C247204019CEFE3CA050E');
			assertDefaultBranchLinks(nodes[0].links);
			expect(nodes[0].calculateHash()).to.deep.equal(new Hash256('DD7BE080F4DEBC3ECA2CEEE49121CC2E8C159CF224E9FF6363AB5282E596697F'));
		});

		it('can deserialize branch with odd path', () => {
			// Arrange:
			const buffer = hexToUint8(`00${ENCODED_ODD_PATH}${ENCODED_BRANCH_LINKS}`);

			// Act:
			const nodes = /** @type {Array<BranchNode>} */ (deserializePatriciaTreeNodes(buffer));

			// Assert:
			expect(nodes.length).to.equal(1);
			expect(nodes[0].path.path).to.deep.equal(hexToUint8('93E37E8616665E4E5DA0CAF388172AB754CEE17FE702019228A996084F6E70'));
			expect(nodes[0].path.size).to.equal(61);
			expect(nodes[0].hexPath).to.equal('93E37E8616665E4E5DA0CAF388172AB754CEE17FE702019228A996084F6E7');
			assertDefaultBranchLinks(nodes[0].links);
			expect(nodes[0].calculateHash()).to.deep.equal(new Hash256('78FAD74CE33005103D4948D94D3B648EFE702F6A507315327D4925D79D7B384E'));
		});

		it('cannot deserialize unknown', () => {
			// Arrange:
			const buffer = hexToUint8(`FE${ENCODED_EVEN_PATH}3A50C5BF83CBA3370CF4E4AC0FC5A6FFB0E29501F66DA12DE25FFB13A419BA77`);

			// Act + Assert:
			expect(() => deserializePatriciaTreeNodes(buffer)).to.throw('invalid marker of a serialized node');
		});

		it('can deserialize multiple nodes including node with even path', () => {
			// Act:
			const nodes = deserializePatriciaTreeNodes(hexToUint8(POSITIVE_PROOF_SERIALIZED_PATH));

			// Assert:
			expect(nodes.length).to.equal(5);
			expect(nodes[0].calculateHash()).to.deep.equal(new Hash256('7AA6503C54F63578FC4301E7EA785760FA7F6677A1DE322A9DE3BFA639BBF070'));
			expect(nodes[1].calculateHash()).to.deep.equal(new Hash256('B3FC1F206624E25A33A71B1E9F646D7FAD46B43DA110C3A144AF8E6A1ACE853D'));
			expect(nodes[2].calculateHash()).to.deep.equal(new Hash256('46A229B981BD2624101CC1C1E57BF1E78D806C3C7D7CE3550705733E53FA59BF'));
			expect(nodes[3].calculateHash()).to.deep.equal(new Hash256('180DBFCF9B96913B67596692688236DBCD987A43289B970AC3B2269F4601F441'));
			expect(nodes[4].calculateHash()).to.deep.equal(new Hash256('8E321E29839084810B0CD552497357ED73D07C200E09F338EBAA7053954D40E1'));
		});

		it('can deserialize multiple nodes including node with odd path', () => {
			// Act:
			const nodes = deserializePatriciaTreeNodes(hexToUint8(POSITIVE_PROOF_SERIALIZED_PATH_ODD));

			// Assert:
			expect(nodes.length).to.equal(4);
			expect(nodes[0].calculateHash()).to.deep.equal(new Hash256('F4ACC6BAECD9CC5984591F34008F08EB5B50B14CE84BDD6EDC73F26F4C68C071'));
			expect(nodes[1].calculateHash()).to.deep.equal(new Hash256('997FAC2CC412C4A359241955390E02DF648D39EE8121578AC192F465C9EC1D41'));
			expect(nodes[2].calculateHash()).to.deep.equal(new Hash256('61F7C1393209E53D38189D28CD3A9C6D4325647F7D1D810994EE9CF1DB90718F'));
			expect(nodes[3].calculateHash()).to.deep.equal(new Hash256('DABE94628AFAC26C029C544A78FDC4649E26E2E2C6B61972B28DCE1974379B23'));
		});
	});

	// endregion

	// region provePatriciaMerkle

	describe('provePatriciaMerkle', () => {
		const POSITIVE_PARAMS = [
			new Hash256('4788FD50029F6E1DEFD128D221EEACC5E1796E1AAA9C247204019CEFE3CA050E'),
			new Hash256('6B432C8195128DECD95437418EDE7F3659EA83DB12E49DE3D320E8E267D585BB'),
			deserializePatriciaTreeNodes(hexToUint8(POSITIVE_PROOF_SERIALIZED_PATH)),
			new Hash256('579B442BB628BA733C358504D98664C2D9E73907F27151F64320368F29392AF0'),
			[
				new Hash256('7AA6503C54F63578FC4301E7EA785760FA7F6677A1DE322A9DE3BFA639BBF070'),
				new Hash256('03F38FF9B414ED92DBDBB3BC6EA3DDC46EEB8A0108C575D7BEC68AD0BACC10D4'),
				new Hash256('0CC0ABA689E56DC5C58B06D1C724CC491BA786A58C3F6834FFF1789F6010E407'),
				new Hash256('592915F441DF771301BA79692BC2BC7AA6677231E19F3C8A46D16E71A21D7DC2'),
				new Hash256('C480CD9B867F3CF503457E976DA0245FD3876CBA42C765201A4C31B5FE926A14'),
				new Hash256('7786D39E25D978EFB75FDCE5F6303FDA44F41AA727DD27BDBF7B218E4396E209'),
				new Hash256('05DE45C81648552622AF7715B583B86B6985FB9FF44ADC287B060BDEDED42E44'),
				new Hash256('DCD00D170CBF0D5D52392F1637BDAE6C9C1502B4723ABEFD6DDCC950070BDCA5'),
				new Hash256('D7B2C9D66D6D364F75EB856C0C6A8431574408368A8BB82B0B3CECE11B00C6C2')
			]
		];
		const POSITIVE_PARAMS_ODD = [
			new Hash256('3A4C540D7E6C7DF3E924E9F1B7D468FF771301AF00B0476E2B7E511379BB559E'),
			new Hash256('DDB3F0E64DA7BC2263C992D6FF7D12A4D4B8728F637777A70029EB5DB41B26D8'),
			deserializePatriciaTreeNodes(hexToUint8(POSITIVE_PROOF_SERIALIZED_PATH_ODD)),
			new Hash256('19AFC8B5D1FB399A397000D002CFC68C699BABD0E9479D6882CF923F0034383C'),
			[
				new Hash256('431247E082949DD7042E7616CFD07CB8A6DC76BE9CA5E34F25CB30A38E329733'),
				new Hash256('D183727515EB37D503BF733AF98A064296EB74F3E9455D96E1C72E8D696BAEC2'),
				new Hash256('F4ACC6BAECD9CC5984591F34008F08EB5B50B14CE84BDD6EDC73F26F4C68C071'),
				new Hash256('57DDA4652B121F78C30C1E24FA2D57B2E3EBBF54B8F24D3F51B286A944D51BAA'),
				new Hash256('0000000000000000000000000000000000000000000000000000000000000000'),
				new Hash256('6804288066C87D40428F8BF1F54675085B2A42E666957C30823284166AF01053'),
				new Hash256('C0FD6AFD53F9F485AA34AA15ADB926F369BD4E22DD0C2265BC24481760C5D045'),
				new Hash256('D6E36F09F8C2161C4AB2388A760EB55745C5E4477F0E15B1E262B4727E16AE99'),
				new Hash256('EE035A4FF9CAB2947C76E2E44BCFF00027C821CBF6D656309817C1738E8B9D73')
			]
		];
		const NEGATIVE_PARAMS = [
			new Hash256('59FAC175E9685A2F56267CCD5E5DABF900471FAC76B9EDB78FE67B2C85128D3B'),
			undefined,
			deserializePatriciaTreeNodes(hexToUint8(NEGATIVE_PROOF_SERIALIZED_PATH)),
			...POSITIVE_PARAMS.slice(3)
		];

		it('cannot validate proof when state hash does not match roots', () => {
			// Arrange: change state hash
			const params = [...POSITIVE_PARAMS];
			params[3] = new Hash256('AAAABBBBCCCCDDDDEEEEFFFF0000111122223333444455556666777788889999');

			// Act:
			const result = provePatriciaMerkle.apply(undefined, [...params]);

			// Assert:
			expect(result).to.equal(PatriciaMerkleProofResult.STATE_HASH_DOES_NOT_MATCH_ROOTS);
		});

		it('cannot validate proof when unanchored path tree', () => {
			// Arrange: drop anchored node
			const params = [...POSITIVE_PARAMS];
			params[2] = deserializePatriciaTreeNodes(hexToUint8(POSITIVE_PROOF_SERIALIZED_PATH)).slice(1);

			// Act:
			const result = provePatriciaMerkle.apply(undefined, [...params]);

			// Assert:
			expect(result).to.equal(PatriciaMerkleProofResult.UNANCHORED_PATH_TREE);
		});

		it('cannot validate proof when leaf value mismatch', () => {
			// Arrange: change leaf value
			const params = [...POSITIVE_PARAMS];
			params[1] = new Hash256('AAAABBBBCCCCDDDDEEEEFFFF0000111122223333444455556666777788889999');

			// Act:
			const result = provePatriciaMerkle.apply(undefined, [...params]);

			// Assert:
			expect(result).to.equal(PatriciaMerkleProofResult.LEAF_VALUE_MISMATCH);
		});

		it('cannot validate proof when unlinked node', () => {
			// Arrange: drop connecting node
			const params = [...POSITIVE_PARAMS];
			params[2] = deserializePatriciaTreeNodes(hexToUint8(POSITIVE_PROOF_SERIALIZED_PATH));
			params[2].splice(1, 1);

			// Act:
			const result = provePatriciaMerkle.apply(undefined, [...params]);

			// Assert:
			expect(result).to.equal(PatriciaMerkleProofResult.UNLINKED_NODE);
		});

		it('cannot validate proof positive when path mismatch', () => {
			// Arrange: change leaf key
			const params = [...POSITIVE_PARAMS];
			params[0] = new Hash256('AAAABBBBCCCCDDDDEEEEFFFF0000111122223333444455556666777788889999');

			// Act:
			const result = provePatriciaMerkle.apply(undefined, [...params]);

			// Assert:
			expect(result).to.equal(PatriciaMerkleProofResult.PATH_MISMATCH);
		});

		it('cannot validate proof negative when path mismatch', () => {
			// Arrange: change leaf key
			const params = [...NEGATIVE_PARAMS];
			params[0] = new Hash256('AAAABBBBCCCCDDDDEEEEFFFF0000111122223333444455556666777788889999');

			// Act:
			const result = provePatriciaMerkle.apply(undefined, [...params]);

			// Assert:
			expect(result).to.equal(PatriciaMerkleProofResult.PATH_MISMATCH);
		});

		it('cannot validate inconclusive negative proof', () => {
			// Arrange: change leaf key to correspond to existing (but not present) branch
			const params = [...NEGATIVE_PARAMS];
			params[0] = new Hash256('59F2C175E9685A2F56267CCD5E5DABF900471FAC76B9EDB78FE67B2C85128D3B');

			// Act:
			const result = provePatriciaMerkle.apply(undefined, [...params]);

			// Assert:
			expect(result).to.equal(PatriciaMerkleProofResult.INCONCLUSIVE);
		});

		it('can validate valid proof positive including node with even path', () => {
			// Act:
			const result = provePatriciaMerkle.apply(undefined, [...POSITIVE_PARAMS]);

			// Assert:
			expect(result).to.equal(PatriciaMerkleProofResult.VALID_POSITIVE);
		});

		it('can validate valid proof positive including node with odd path', () => {
			// Act:
			const result = provePatriciaMerkle.apply(undefined, [...POSITIVE_PARAMS_ODD]);

			// Assert:
			expect(result).to.equal(PatriciaMerkleProofResult.VALID_POSITIVE);
		});

		it('can validate valid proof negative', () => {
			// Act:
			const result = provePatriciaMerkle.apply(undefined, [...NEGATIVE_PARAMS]);

			// Assert:
			expect(result).to.equal(PatriciaMerkleProofResult.VALID_NEGATIVE);
		});
	});

	// endregion
});
