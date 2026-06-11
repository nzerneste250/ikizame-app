-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 11, 2026 at 04:47 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `driving_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `exams`
--

CREATE TABLE `exams` (
  `id` int(11) NOT NULL,
  `question` text NOT NULL,
  `option_a` varchar(255) NOT NULL,
  `option_b` varchar(255) NOT NULL,
  `option_c` varchar(255) NOT NULL,
  `option_d` varchar(255) NOT NULL,
  `correct_option` char(1) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `exams`
--

INSERT INTO `exams` (`id`, `question`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `image_path`) VALUES
(1, 'Mu gihe utwaye ikinyabiziga uva kuri A ugana kuri B, Iki kimenyetso kiri mu muhanda kivuze iki ?\r\n', 'Umuyobozi w’ikinyabiziga ashobora kunyuranaho arenze umurongo wera udacagaguye', 'Umuyobozi w’ikinyabiziga abujijwe kunyuranaho arenze imirongo yera', 'Umuyobozi w’ikinyabiziga yemerewe kunyuranaho', 'Abayobozi b’ibinyamitende gusa bemerewe kunyuranaho barenze umurongo wera udacagaguye', 'B', 'sign5.png'),
(2, 'Ikinyabiziga cyose cyangwa ibinyabiziga\r\nbigenda bigomba kugira:', 'Umuyobozi', 'Umuherekeza', 'A na B ni ibisubizo by’ukuri', 'Nta gisubizo cy’ukuri kirimo', 'A', NULL),
(3, 'Ijambo “akayira” bivuga inzira\r\nnyabagendwa ifunganye yagenewe gusa:', 'Abanyamaguru', 'Ibinyabiziga bigendera ku biziga bibiri', 'A na B ni ibisubizo by’ukuri', 'Nta gisubizo cy’ukuri kirimo', 'C', NULL),
(4, 'Umurongo uciyemo uduce umenyesha\r\nahegereye umurongo ushobora kuzuzwa\r\nn’uturanga gukata tw’ibara ryera utwo\r\nturanga cyerekezo tumenyesha :', 'Igisate cy’umuhanda abayobozi bagomba gukurikira', 'Ahegereye umurongo ukomeje', 'Igabanurwa ry’umubare w’ibisate by’umuhanda mu cyerekezo bajyamo', 'A na C nibyo', 'C', NULL),
(5, 'Ahantu ho kugendera mu muhanda\r\nherekanwa n’ibimenyetso bimurika\r\nibinyabiziga ntibishobora kuhagenda :', 'Biteganye', 'Ku murongo umwe', 'A na B nibyo', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(6, 'Ibinyabiziga bikurikira bigomba gukorerwa\r\nisuzumwa buri mwaka:', 'Ibinyabiziga bigenewe gutwara abagenzi muri rusange', 'Ibinyabiziga bigenewe gutwara ibintu birengeje toni 3.5', 'Ibinyabiziga bigenewe kwigisha gutwara', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(7, 'Ubugari bwa romoruki ikuruwe\r\nn’ikinyamitende itatu ntibugomba kurenza\r\nibipimo bikurikira:', 'cm75', 'cm125', 'cm265', 'Nta gisubizo cy’ukuri', 'D', NULL),
(8, 'Uburebure bw’ibinyabiziga bikurikira\r\nntibugomba kurenga metero 11 :', 'Ibifite umutambiko umwe uhuza imipira', 'Ibifite imitambiko ibiri ikurikiranye mu bugari bwayo', 'Makuzungu', 'Nta gisubizo cy’ukuri', 'D', NULL),
(9, 'Ikinyabiziga kibujijwe guhagarara akanya\r\nkanini aha hakurikira :', 'Ahatarengeje metero 1 imbere cyangwa inyuma y’ikinyabiziga gihagaze akanya gato cyangwa kanini ', 'Ahantu hari ibimenyetso bibuza byabugenewe', 'Aho abanyamaguru banyura mu muhanda ngo bakikire inkomyi', 'Ibisubizo byose nibyo', 'D', NULL),
(10, 'Kunyuranaho bikorerwa:', 'Mu ruhande rw’iburyo gusa', 'Igihe cyose ni ibumoso', 'Iburyo iyo unyura ku nyamaswa', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(11, 'Icyapa cyerekana umuvuduko ntarengwa\r\nikinyabiziga kitagomba kurenza gishyirwa gusa\r\nku binyabiziga bifite uburemere ntarengwa\r\nbukurikira:', 'Burenga toni 1', 'Burenga toni 2', 'Burenga toni 24', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(12, 'Ahatari mu nsisiro umuvuduko ntarengwa\r\nmu isaha wa velomoteri ni: ', 'Km50', 'Km40', 'Km30', 'Nta gisubizo cy’ukuri', 'A', NULL),
(13, 'Umuyobozi ugenda mu muhanda igihe\r\nubugari bwawo budatuma anyuranaho nta\r\nnkomyi ashobora kunyura mu kayira\r\nk’abanyamaguru ariko amaze kureba ibi\r\nbikurikira:', 'Umuvuduko w’abanyamaguru', 'Ubugari bw’umuhanda', 'Umubare w’abanyamaguru', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(14, 'Ku byerekeye kwerekana ibinyabiziga\r\nn’ukumurika kwabyo ndetse no kwerekana\r\nihindura ry’ibyerekezo byabyo. Birabujijwe\r\ngukora andi matara cyangwa utugarurarumuri\r\nuretse ibitegetswe ariko ntibireba amatara\r\nakurikira:', 'Amatara ndanga', 'Amatara ari imbere mu modoka', 'Amatara ndangaburambarare', 'Ibisubizo byose nibyo', 'B', NULL),
(15, 'Iyo nta mategeko awugabanya\r\nby’umwihariko umuvuduko ntarengwa\r\nw’amapikipiki mu isaha ni:', 'Km25', 'Km70', 'Km40', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(16, 'Uburyo bukoreshwa kugirango ikinyabiziga\r\nkigende gahoro igihe feri idakora neza babwita:', 'Feri y’urugendo', 'Feri yo guhagarara umwanya munini', 'Feri yo gutabara', 'Nta gisubizo cy’ukuri kirimo', 'C', NULL),
(17, 'Nibura ikinyabiziga gitegetswe kugira\r\nuduhanagurakirahure tungahe:', '2', '3', '1', 'Nta gisubizo cy’ukuri kirimo', 'C', NULL),
(18, 'Amatara maremare y’ikinyabiziga agomba\r\nkuzimwa mu bihe bikurikira:', 'Iyo umuhanda umurikiye umuyobozi abasha kureba muri metero 20', 'Iyo ikinyabiziga kigiye kubisikana n’ibindi', 'Iyo ari mu nsisiro', 'Ibisubizo byose ni ukuri', 'B', NULL),
(19, 'Ikinyabiziga ntigishobora kugira amatara\r\narenga abiri y’ubwoko bumwe keretse\r\nkubyerekeye amatara akurikira:', 'Itara ndangamubyimba', 'Itara ryerekana icyerekezo', 'Itara ndangaburumbarare', 'Ibisubizo byose ni ukuri', 'D', NULL),
(20, 'Ubugari bwa romoruki ikuruwe n’igare\r\ncyangwa velomoteri ntiburenza ibipimo\r\nbikurikira:', 'cm25', 'cm125', 'cm45', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(21, 'Ibinyabiziga bikoreshwa nka tagisi,\r\nbitegerereza abantu mu nzira nyabagendwa,\r\nbishobora gushyirwaho itara ryerekana ko\r\nikinyabiziga kitakodeshejwe. Iryo tara\r\nrishyirwaho ku buryo bukurikira:', 'Ni itara ry’icyatsi rishyirwa imbere ku kinyabiziga', 'Ni itara ry’icyatsi rishyirwa ibumoso', 'Ni itara ry’umuhondo rishyirwa inyuma', 'A na C ni ibisubizo by’ukuri', 'A', NULL),
(22, 'Za otobisi zagenewe gutwara abanyeshuri zishobora gushyirwaho amatara abiri asa n’icunga rihishije amyasa kugirango yerekane ko zihagaze no kwerekana ko bagomba kwitonda, ayo matara ashyirwaho ku buryo bukurikira ', 'Amatara abiri ashyirwa inyuma', 'Amatara abiri ashyirwa imbere', 'Rimwe rishyirwa imbere irindi inyuma', 'b na c ni ibisubizo by’ukuri', 'C', ''),
(24, 'Iyo umuvuduko w’ibinyabiziga bidapakiye\r\nushobora kurenga km50 mu isaha ahategamye,\r\nbigomba kuba bifite ibikoresho by’ihoni\r\nbyumvikanira mu ntera:', 'Metero 100', 'Metero 200', 'Metero 50', 'Metero 150', 'C', NULL),
(25, 'Uri hafi kunyura k’umuyobozi\r\nw’ikinyamitende. Muri ibi byapa\r\nbikurikira nikihe wakwitondera?\r\n', 'images.png', 'Philippines_road_sign_R3-14.svg.png', 'Screenshot_2026-06-09_165909.png', 'Nepal_road_sign_A15.svg.png', 'C', ''),
(26, 'Nikihe cyapa cyerekena ko nta kinyabiziga\r\ngifite moteri cyemerewe kuhanyura?\r\n', 'Nepal_road_sign_A15.svg.png', '619.jpg', '4.jpg', 'LT_road_sign_325.png', 'B', NULL),
(28, 'Iki cyapa gisobanura iki ?', 'Iherezo ry’ibibuzwa byose mu karere ku binyabiziga bigenda', 'Ntihemerewe kuhahagarara', 'Umuvuduko ntarengwa wemewe', 'Nta gisubizo cy’ukuri kirimo', 'A', '4.jpg'),
(29, 'Ikinyabiziga gishya gikenerwa gusuzumwa bwambere nyuma y’igihe kingana iki ?', 'Nyuma y’umwaka umwe', 'Nyuma y’imyaka ibiri', 'A na b ni ibisubizo by’ukuri ', 'Nta gisubizo cy’ukuri', 'B', NULL),
(30, 'Ni ryari ushobora kwakiriza icyarimwe amatara yose ndangacyerekezo y’ikinyabiziga?', 'Mu gihe ushaka kuburira abandi bakoresha umuhanda', 'Mu gihe ikinyabiziga cyawe gishobora guteza ibyago', 'A na b ni ibisubizo by’ukuri ', 'Ntagisubizo cy’ukuri', 'C', NULL),
(31, 'Ugeze ahabereye impanuka yo mumuhanda bwambere ugasanga abakomeretse bikomeye. wakiriza icyarimwe amatara y’ibyerekezo byombi, niki kindi ushobora gukora?', 'Kumenya neza niba imbangukiragutabara yahamagawe', 'Guhagarika ibinyabiziga bindi no kubasaba ubufasha', 'A na b ni ibisubizo by’ukuri', 'Nta gisubizo cy’ukuri', 'A', NULL),
(32, 'Umuyobozi w’ikinyabizaga cy’ikoreye ibintu bishobora gufata inkongi, n’ikihe cyapa cyerekana ko ibyo atwaye biturika by’afata inkongi ?', '56295.jpg.webp', 'sign.png', '360_F_58022217_LwV816qZMbDGgnyWtPaBkw6Mic07p7U0.jpg', 'images_(1).png', 'B', NULL),
(33, 'Icyapa gikoze mw’ishusho ya mpandeshatu kimenyesha:', 'Ntihanyurwa n’abanyamaguru', 'Akayira kabanyamaguru', 'Aho abanayamaguru bambukira', 'B na c ni ibisubizo by’ukuri', 'A', '360_F_102830042_wlhSGEq5LQZcnwgp1im1UN65apkKdP1P.jpg'),
(35, 'Mu gihe Umuntu ufite ubumuga bwo kutabona yambuka umuhanda yitwaje inkoni yera y’abatabona:\r\n', 'Umuyobozi w’ikinyabiziga agomba gufata iyo nkoni nk’icyapa kimumenyesha ko agomba guhagarara', 'Vuza ihoni ukomeze', 'Gabanya nurangiza ukomeze witonze', 'Ibisubizo byose ni ukuri', 'A', NULL),
(36, 'N’iyihe myifatire myiza wagira ugeze aho abana bari hafi y’inzira nyabagendwa?', 'Itonde , witegereze ni biba ngongwa ubaburire unitegura kuba wahagarara.', 'Ihute urenge aho abo bana bari', 'Komeza ugume ku muvuduko munini', 'Komeza ugendere kuruhande rw’iburyo', 'A', 'sign1.png'),
(37, 'Niki umuyobozi w’ikinyabiziga yakora mugihe ahuye n’ikinyabiziga cyakije itara ry’umuhondo rimyatsa?', 'Mu gihe ikinyabiziga giturutse mu kindi cyerekezo kitagishoboye kugenda', 'Mu gihe ikinyabiziga ndakumirwa giturutse mu kindi cyerekezo', 'Mu gihe ikinyabiziga giturutse mu cyindi cyerekezo cy’ihuta', 'Kugabanya umuvuduko witegura guhagarara', 'D', NULL),
(38, 'Umuyobozi w’ikinyabiziga yakara iki mu gihe anyuzweho nikindi kinyabiziga?', 'Gukomezanya umuvuduko warufite', 'Kujya i buryo', 'Kujya I bumoso', 'Kwongera umuvuduko', 'A', NULL),
(39, 'Umurongo w’umweru urombereje uciye hagati mu muhanda uvuze iki?', 'Umuyobozi wese abujijwe kuwurenga', 'Abanyamitende wemerewe kunyuranaho', 'Kuhahagara biremewe', 'Guhindukira ku manywa', 'A', 'sign2.png'),
(40, 'Ni iki umuyobozi w’ikinyabiziga yakora ahuye n’ishyo ry’amatungo munzira nyabagendwa?\r\n', 'Kuvuza ihoni kugirango ayo matungo atambuke', 'Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko no gutambukana ubwitonzi', 'Kwatsa amatara maremare n’amagufi no gutambuka vuba bishoboka', 'Kuvuza ihoni no gutambukana ubwitonzi', 'B', NULL),
(41, 'Umuyobozi w’ikinyabiziga yakora iki igihe ageze ku kazamuko gashinze cyane ?', 'Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko akaguma kuruhande rw’iburyo yirinda ibyago ', 'Gukandagira ikirenge cya amburiyage no kuvuza ihoni ryo kumunyesha ', 'Kugumana umuvuduko n’ikirekezo wari ufite mu muhanda', 'Guhagarara ku mpera zuwo musozi', 'A', NULL),
(42, 'Umuyobozi w’ikinyabizaga uri kugendera mu muhanda w’ibyerekezo bibiri nuruhe ruhande rw’umuhanda agomba gukoresha ?', 'uruhande rw’ibumoso bw’umuhanda uretse igihe atawaye imashini zihinga cyangwa zikoreshwa indi mirimo', 'Mu gice cy\'umuhanda yumva ashaka', 'Mu gice cy’iburyo bw’umuhanda uretse igihe ashaka kunyuranaho cyangwa gukata ibumoso', ' Ku ruhande rw’ibumoso bw’umuhanda', 'C', ''),
(43, 'Mu byapa bikurikira , ni ikihe cyerekana umuhanda udakomeza:\r\n', 'Icyapa C1', 'Icyapa E14', 'Icyapa C2a', 'Icyapa B2a', 'B', 'sign3.png'),
(44, 'Muri ibi byapa bikurikira ni ikihe cyerekana ko umuyobozi ukibonye yemerewe gutambuka mbere y\'abaturutse aho agana mu nzira ifunganye:\r\n', 'Icyapa B6', 'Icyapa A19', 'Icyapa B3', 'Icyapa A22a', 'A', 'sign4.png'),
(45, 'Za otobisi zagenewe gutwara abanyeshuri zishobora gushyirwaho amatara abiri asa n’icunga rihishije amyasa kugirango yerekane ko zihagaze no kwerekana ko bagomba kwitonda, ayo matara ashyirwaho ku buryo bukurikira :', 'Amatara abiri ashyirwa inyuma', 'Amatara abiri ashyirwa imbere', 'Rimwe rishyirwa imbere irindi inyuma', 'b na c ni ibisubizo by’ukuri', 'C', NULL),
(46, 'Itara ryo guhagarara ry’ibara ritukura rigomba kugaragara igihe ijuru rikeye nibura mu ntera ikurikira:\r\n', 'Metero 100 ku manywa na metero 20 mu ijoro', 'Metero 150 ku manywa na metero50 mu ijoro', 'Metero 200 ku manywa na metero100 mu ijoro', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(47, 'bizirikisho by’iminyururu cyangwa by’insinga kimwe n’ibindi by’ingoboka bikoreshwa gusa igihe nta kundi umuntu yabigenza kandi nta kindi bigiriwe uretse gusa kugirango ikinyabiziga kigere aho kigomba gukorerwa kandi nturenze na rimwe km 20 mu\r\nisaha, ibyo bizirikisho bigaragazwa ku buryo bukurikira:', 'Agatambaro gatukura kuri cm 50 z’umuhanda', 'Ikimenyetso cy’itara risa n’icunga rihishije', 'Icyapa cyera cya mpande enye zingana gifite cm 20 kuri buri ruhande', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(48, 'Iyo nta mategeko awugabanya by’umwihariko, umuvuduko ntarengwa ku modoka zitwara abagenzi mu buryo bwa rusange ni:', 'Km 60 mu isaha', 'Km 40 mu isaha', 'Km 25 mu isaha', 'Km20 mu isaha', 'A', NULL),
(49, 'Iyo nta mategeko awugabanya by’umwihariko, umuvuduko ntarengwa ku modoka zikoreshwa nk’amavatiri y’ifasi cyangwa amatagisi zifite uburemere bwemewe butarenga kilogarama 3500 ni:\r\n', 'Km 60 mu isaha', 'Km 40 mu isaha', 'Km 75 mu isaha', 'Km20 mu isaha', 'C', NULL),
(50, 'Ikinyabiziga kibujijwe guhagarara akanya kanini aha hakurikira :', 'Imbere y’ahantu hinjirwa hakasohokerwa n’abantu benshi', 'Mu muhanda aho ugabanyijemo ibisate bigaragazwa n’imirongo idacagaguye', 'A na B ni ibisubizo by’ukuri', 'Nta gisubizo cy’ukuri kirimo', 'C', NULL),
(51, 'Ubugari bwa romoruki ntiburenza ubugari\r\nbw’ikinyabiziga kiyikurura iyo ikuruwe\r\nn’ibinyabiziga bikurikira:', 'Igare', 'Velomoteri', 'Ipikipiki ifite akanyabiziga kometse ku ruhande rwayo', 'Nta gisubizo cy’ukuri kirimo', 'C', NULL),
(52, 'Iyo hatarimo indi myanya birabujijwe\r\ngutwara ku ntebe y’imbere y’imodoka abana\r\nbadafite imyaka:\r\n', 'Imyaka 10', 'Imyaka 12', 'Imyaka 7', 'Ntagisubizo cy’ukuri kirimo', 'B', NULL),
(53, 'Icyapa kivuga gutambuka mbere\r\ny’ibinyabiziga biturutse imbere gifite amabara\r\nakurikira', 'Ubuso ni umweru', 'Ikirango ni umutuku n’umukara', 'Ikirango ni umweru n’umukara', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(54, 'Utuyira turi ku mpande z’umuhanda\r\nn’inkengero zigiye hejuru biharirwa\r\nabanyamaguru mu bihe bikurikira:', 'Iyo hari amategeko yihariye yerekanwa n’ibimenyetso', 'Iyo badatatanye kandi bayobowe n’umwarimu', 'Iyo hatari amategeko yihariye yerekanwa n’ibimenyetso', 'Ibisubizo byose ni ukuri', 'C', NULL),
(55, 'Uretse mu mijyi kuyindi mihanda yagenywe\r\nna minisiteri ushinzwe gutwara ibintu\r\nn’abantu, uburemere ntarengwa bwemewe ku\r\nbinyabiziga bifatanye bifite imitambiko itatu\r\nni:\r\n', 'toni 20', 'toni 16 ', 'toni 12', 'toni 10', 'C', NULL),
(56, 'Hejuru y’aka kanunga:', 'Nshobora kunyura ku kinyabiziga icyo aricyose mu gihe nagabanyije umuvuduko', 'nshobora kunyura gusa kubinyabiziga by’imitende ibiri ', 'kunyuranaho ibumoso birabujijwe ', 'a na b ni ibisubizo by’ukuri ', 'C', '360_F_655773389_rwIzhjZ2gYv1LxIWCDq5ZiVOLCQnXuOg.jpg'),
(57, 'Mu gihe cy’impanuka mu muhanda\r\nn’ubundi bushotoranyi ni yihe nimero ya\r\ntelefone y’ubutabazi wahamagara :\r\n', '911', '100', '112', '131', 'C', '3XAX7JDBFRAR3DIENJAY7XWY64.webp'),
(58, 'Ikindi kinyabiziga kiguturutse inyuma\r\nkiguterera amatara y’urumuri rumyasa,\r\nwakora iki?', 'Kongera umuvuduko kugira ngo intera iri hagati yawe n’ukuri inyuma igumeho', 'Fata feri y’urugendo kugira ngo umwereke ko ugiye guhagarara', 'Emerera icyo kinyabiziga kugutambukaho niba imbere ntacyago gihari', 'Nta gisubizo cy’ukuri kirimo', 'C', NULL),
(59, 'Amatara y’urugendo, mu gihe cy’ibihu:\r\n', 'Ni meza kuko atuma ureba kure', 'Ni mabi kuko arakugarukira akaguhuma amaso', 'Akwizeza ko abandi bakubona', 'Nta gisubizo cy’ukuri', 'B', NULL),
(60, 'Iyo mu muhanda hashushanyijemo\r\numurongo wera ucagaguye, ntugomba', 'Ntugomba kujya mu kindi gice cy’umuhanda', 'Ushobora kujya mu kindi gice cy’umuhanda bibaye ngombwa', 'Agomba guhagarika ikinyabiziga', 'Nta gisubizo cy’ukuri', 'B', NULL),
(61, 'Umuyobozi w’ikinyabiziga ugeze mu\r\nisangano ry’umuhanda ugenzurwa ni\r\nibimenyetso by’amatara yaka agasanga ataka\r\n(adakora), yakora iki?', 'Guca mu isangano n’ubwitonzi nkaho ntakimenyetso kikuyobora kirimo, witondera abandi bayobozi b’ibinyabiziga ', 'Gutwara neza ntagutinda mw’isangano', 'Guhagarara mw’isangano no guha inzira abayobozi b’ibinyabiziga baturuka iburyo bwawe ', 'Gucana amatara yose ndanga cyerekezo ugakomeza', 'A', NULL),
(62, 'Niryari amatara ndanga cyerekezo agomba\r\nkugaragazwa kubandi bakoresha umuhanda ?', 'igihe gusa ari ngombwa amenyesha ibindi binyabiziga bimukurikiye', 'igihe gusa aringombwa kuburira abandi bayobozi bava mukindi cyerekezo ', 'keretse ahari ibimenyetso byo mu muhanda byerekana icyerekezo cyawe ', 'mugihe gikwiye ushaka kumenyesha abandi bakoresha umuhanda icyo ugiye gukora', 'D', NULL),
(63, 'Ugeze mu masangano y’umuhanda aho\r\nusanga ibimenyetso bimurika bidakora, wakora\r\niki igihe umukozi ubifiye ububasha aguhaye iki\r\nkimenyesto ?', 'gukata ibumoso gusa', 'gukata iburyo gusa ugakomeza imbere', 'Guhagarara kumurongo wo guhagarara umwanya moto ', 'komeza imbere gusa', 'C', 'mqdefault.jpg'),
(64, 'Amatara ndangacyerekezo agomba\r\nkugaragara nijoro igihe ijuru rikeye mu ntera\r\nnibura ya:', 'm 100', 'm 200', 'm150', 'm250', 'C', NULL),
(65, 'Ibyapa bitegeka bikozwe muyihe\r\nshusho?', '1.png', '2.png', '3.jpg', '1014910.png', 'C', NULL),
(66, 'Mugihe ikinyabiziga cyacu bakinyuzeho', 'Tugomba kugabanya umuvuduko', 'Tugomba kongera umuvuduko', 'Tugomba kongera umuvuduko n’ubwitonzi', 'Nta gisubizo cy’ ukuri kirimo', 'A', NULL),
(67, 'Kuvuza ihoni bibujijwe:', 'Ku musigiti, ku rusengero, ku rutambiro', 'Hafi y’ibitaro', 'Hafi y’ubuyobozi bwa polisi', 'Nta gisubizo cy’ukuri', 'B', NULL),
(68, 'Icyemezo cy’Isuzuma ry’ikinyabiziga\r\nkimara igihe kingana iki?', 'Amezi 6 kubinyabiziga bikora ubucuruzi', 'Amezi 12 ku binyabiziga bidakora ubucuruzi', 'Imyaka 2', 'A na B ni ibisubizo by’ukuri', 'D', NULL),
(69, 'Niki umuyobozi w’ikinyabiziga yakora mu\r\ngihe abonye icyapa kiburira cya mpande eshatu\r\ngitukura mu muhanda?', 'Hagarara utegereze amabwiriza', 'Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko ateganya icyago imbere ye', 'Kukireka, ukagumana umuvuduko ufite ugakomeza', 'Hagarara kuri icyo cyapa cya mpande eshatu mbere yo gukomeza', 'B', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `portal_admins`
--

CREATE TABLE `portal_admins` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `portal_admins`
--

INSERT INTO `portal_admins` (`id`, `username`, `password`) VALUES
(1, 'admin', 'admin123');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `exams`
--
ALTER TABLE `exams`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `portal_admins`
--
ALTER TABLE `portal_admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `exams`
--
ALTER TABLE `exams`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=70;

--
-- AUTO_INCREMENT for table `portal_admins`
--
ALTER TABLE `portal_admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
