-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 19, 2026 at 03:50 AM
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
(23, 'Iyo umuvuduko w’ibinyabiziga bidapakiye\r\nushobora kurenga km50 mu isaha ahategamye,\r\nbigomba kuba bifite ibikoresho by’ihoni\r\nbyumvikanira mu ntera:', 'Metero 100', 'Metero 200', 'Metero 50', 'Metero 150', 'C', NULL),
(24, 'Uri hafi kunyura k’umuyobozi\r\nw’ikinyamitende. Muri ibi byapa\r\nbikurikira nikihe wakwitondera?\r\n', 'images.png', 'Philippines_road_sign_R3-14.svg.png', 'Screenshot_2026-06-09_165909.png', 'Nepal_road_sign_A15.svg.png', 'C', ''),
(25, 'Nikihe cyapa cyerekena ko nta kinyabiziga\r\ngifite moteri cyemerewe kuhanyura?\r\n', 'Nepal_road_sign_A15.svg.png', '619.jpg', '4.jpg', 'LT_road_sign_325.png', 'B', NULL),
(26, 'Iki cyapa gisobanura iki ?', 'Iherezo ry’ibibuzwa byose mu karere ku binyabiziga bigenda', 'Ntihemerewe kuhahagarara', 'Umuvuduko ntarengwa wemewe', 'Nta gisubizo cy’ukuri kirimo', 'A', '4.jpg'),
(27, 'Ikinyabiziga gishya gikenerwa gusuzumwa bwambere nyuma y’igihe kingana iki ?', 'Nyuma y’umwaka umwe', 'Nyuma y’imyaka ibiri', 'A na b ni ibisubizo by’ukuri ', 'Nta gisubizo cy’ukuri', 'B', NULL),
(28, 'Ni ryari ushobora kwakiriza icyarimwe amatara yose ndangacyerekezo y’ikinyabiziga?', 'Mu gihe ushaka kuburira abandi bakoresha umuhanda', 'Mu gihe ikinyabiziga cyawe gishobora guteza ibyago', 'A na b ni ibisubizo by’ukuri ', 'Ntagisubizo cy’ukuri', 'C', NULL),
(29, 'Ugeze ahabereye impanuka yo mumuhanda bwambere ugasanga abakomeretse bikomeye. wakiriza icyarimwe amatara y’ibyerekezo byombi, niki kindi ushobora gukora?', 'Kumenya neza niba imbangukiragutabara yahamagawe', 'Guhagarika ibinyabiziga bindi no kubasaba ubufasha', 'A na b ni ibisubizo by’ukuri', 'Nta gisubizo cy’ukuri', 'A', NULL),
(30, 'Umuyobozi w’ikinyabizaga cy’ikoreye ibintu bishobora gufata inkongi, n’ikihe cyapa cyerekana ko ibyo atwaye biturika by’afata inkongi ?', '56295.jpg.webp', 'sign.png', '360_F_58022217_LwV816qZMbDGgnyWtPaBkw6Mic07p7U0.jpg', 'images_(1).png', 'B', NULL),
(31, 'Icyapa gikoze mw’ishusho ya mpandeshatu kimenyesha:', 'Ntihanyurwa n’abanyamaguru', 'Akayira kabanyamaguru', 'Aho abanayamaguru bambukira', 'B na c ni ibisubizo by’ukuri', 'A', '360_F_102830042_wlhSGEq5LQZcnwgp1im1UN65apkKdP1P.jpg'),
(32, 'Mu gihe Umuntu ufite ubumuga bwo kutabona yambuka umuhanda yitwaje inkoni yera y’abatabona:\r\n', 'Umuyobozi w’ikinyabiziga agomba gufata iyo nkoni nk’icyapa kimumenyesha ko agomba guhagarara', 'Vuza ihoni ukomeze', 'Gabanya nurangiza ukomeze witonze', 'Ibisubizo byose ni ukuri', 'A', NULL),
(33, 'N’iyihe myifatire myiza wagira ugeze aho abana bari hafi y’inzira nyabagendwa?', 'Itonde , witegereze ni biba ngongwa ubaburire unitegura kuba wahagarara.', 'Ihute urenge aho abo bana bari', 'Komeza ugume ku muvuduko munini', 'Komeza ugendere kuruhande rw’iburyo', 'A', 'sign1.png'),
(34, 'Niki umuyobozi w’ikinyabiziga yakora mugihe ahuye n’ikinyabiziga cyakije itara ry’umuhondo rimyatsa?', 'Mu gihe ikinyabiziga giturutse mu kindi cyerekezo kitagishoboye kugenda', 'Mu gihe ikinyabiziga ndakumirwa giturutse mu kindi cyerekezo', 'Mu gihe ikinyabiziga giturutse mu cyindi cyerekezo cy’ihuta', 'Kugabanya umuvuduko witegura guhagarara', 'D', NULL),
(35, 'Umuyobozi w’ikinyabiziga yakara iki mu gihe anyuzweho nikindi kinyabiziga?', 'Gukomezanya umuvuduko warufite', 'Kujya i buryo', 'Kujya I bumoso', 'Kwongera umuvuduko', 'A', NULL),
(36, 'Umurongo w’umweru urombereje uciye hagati mu muhanda uvuze iki?', 'Umuyobozi wese abujijwe kuwurenga', 'Abanyamitende wemerewe kunyuranaho', 'Kuhahagara biremewe', 'Guhindukira ku manywa', 'A', 'sign2.png'),
(37, 'Ni iki umuyobozi w’ikinyabiziga yakora ahuye n’ishyo ry’amatungo munzira nyabagendwa?\r\n', 'Kuvuza ihoni kugirango ayo matungo atambuke', 'Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko no gutambukana ubwitonzi', 'Kwatsa amatara maremare n’amagufi no gutambuka vuba bishoboka', 'Kuvuza ihoni no gutambukana ubwitonzi', 'B', NULL),
(38, 'Umuyobozi w’ikinyabiziga yakora iki igihe ageze ku kazamuko gashinze cyane ?', 'Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko akaguma kuruhande rw’iburyo yirinda ibyago ', 'Gukandagira ikirenge cya amburiyage no kuvuza ihoni ryo kumunyesha ', 'Kugumana umuvuduko n’ikirekezo wari ufite mu muhanda', 'Guhagarara ku mpera zuwo musozi', 'A', NULL),
(39, 'Umuyobozi w’ikinyabizaga uri kugendera mu muhanda w’ibyerekezo bibiri nuruhe ruhande rw’umuhanda agomba gukoresha ?', 'uruhande rw’ibumoso bw’umuhanda uretse igihe atawaye imashini zihinga cyangwa zikoreshwa indi mirimo', 'Mu gice cy\'umuhanda yumva ashaka', 'Mu gice cy’iburyo bw’umuhanda uretse igihe ashaka kunyuranaho cyangwa gukata ibumoso', ' Ku ruhande rw’ibumoso bw’umuhanda', 'C', ''),
(40, 'Mu byapa bikurikira , ni ikihe cyerekana umuhanda udakomeza:\r\n', 'Icyapa C1', 'Icyapa E14', 'Icyapa C2a', 'Icyapa B2a', 'B', 'sign3.png'),
(41, 'Muri ibi byapa bikurikira ni ikihe cyerekana ko umuyobozi ukibonye yemerewe gutambuka mbere y\'abaturutse aho agana mu nzira ifunganye:\r\n', 'Icyapa B6', 'Icyapa A19', 'Icyapa B3', 'Icyapa A22a', 'A', 'sign4.png'),
(42, 'Itara ryo guhagarara ry’ibara ritukura rigomba kugaragara igihe ijuru rikeye nibura mu ntera ikurikira:\r\n', 'Metero 100 ku manywa na metero 20 mu ijoro', 'Metero 150 ku manywa na metero50 mu ijoro', 'Metero 200 ku manywa na metero100 mu ijoro', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(43, 'bizirikisho by’iminyururu cyangwa by’insinga kimwe n’ibindi by’ingoboka bikoreshwa gusa igihe nta kundi umuntu yabigenza kandi nta kindi bigiriwe uretse gusa kugirango ikinyabiziga kigere aho kigomba gukorerwa kandi nturenze na rimwe km 20 mu\r\nisaha, ibyo bizirikisho bigaragazwa ku buryo bukurikira:', 'Agatambaro gatukura kuri cm 50 z’umuhanda', 'Ikimenyetso cy’itara risa n’icunga rihishije', 'Icyapa cyera cya mpande enye zingana gifite cm 20 kuri buri ruhande', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(44, 'Iyo nta mategeko awugabanya by’umwihariko, umuvuduko ntarengwa ku modoka zitwara abagenzi mu buryo bwa rusange ni:', 'Km 60 mu isaha', 'Km 40 mu isaha', 'Km 25 mu isaha', 'Km20 mu isaha', 'A', NULL),
(45, 'Iyo nta mategeko awugabanya by’umwihariko, umuvuduko ntarengwa ku modoka zikoreshwa nk’amavatiri y’ifasi cyangwa amatagisi zifite uburemere bwemewe butarenga kilogarama 3500 ni:\r\n', 'Km 60 mu isaha', 'Km 40 mu isaha', 'Km 75 mu isaha', 'Km20 mu isaha', 'C', NULL),
(46, 'Ikinyabiziga kibujijwe guhagarara akanya kanini aha hakurikira :', 'Imbere y’ahantu hinjirwa hakasohokerwa n’abantu benshi', 'Mu muhanda aho ugabanyijemo ibisate bigaragazwa n’imirongo idacagaguye', 'A na B ni ibisubizo by’ukuri', 'Nta gisubizo cy’ukuri kirimo', 'C', NULL),
(47, 'Ubugari bwa romoruki ntiburenza ubugari\r\nbw’ikinyabiziga kiyikurura iyo ikuruwe\r\nn’ibinyabiziga bikurikira:', 'Igare', 'Velomoteri', 'Ipikipiki ifite akanyabiziga kometse ku ruhande rwayo', 'Nta gisubizo cy’ukuri kirimo', 'C', NULL),
(48, 'Iyo hatarimo indi myanya birabujijwe\r\ngutwara ku ntebe y’imbere y’imodoka abana\r\nbadafite imyaka:\r\n', 'Imyaka 10', 'Imyaka 12', 'Imyaka 7', 'Ntagisubizo cy’ukuri kirimo', 'B', NULL),
(49, 'Icyapa kivuga gutambuka mbere\r\ny’ibinyabiziga biturutse imbere gifite amabara\r\nakurikira', 'Ubuso ni umweru', 'Ikirango ni umutuku n’umukara', 'Ikirango ni umweru n’umukara', 'Nta gisubizo cy’ukuri kirimo', 'D', NULL),
(50, 'Utuyira turi ku mpande z’umuhanda\r\nn’inkengero zigiye hejuru biharirwa\r\nabanyamaguru mu bihe bikurikira:', 'Iyo hari amategeko yihariye yerekanwa n’ibimenyetso', 'Iyo badatatanye kandi bayobowe n’umwarimu', 'Iyo hatari amategeko yihariye yerekanwa n’ibimenyetso', 'Ibisubizo byose ni ukuri', 'C', NULL),
(51, 'Uretse mu mijyi kuyindi mihanda yagenywe\r\nna minisiteri ushinzwe gutwara ibintu\r\nn’abantu, uburemere ntarengwa bwemewe ku\r\nbinyabiziga bifatanye bifite imitambiko itatu\r\nni:\r\n', 'toni 20', 'toni 16 ', 'toni 12', 'toni 10', 'C', NULL),
(52, 'Hejuru y’aka kanunga:', 'Nshobora kunyura ku kinyabiziga icyo aricyose mu gihe nagabanyije umuvuduko', 'nshobora kunyura gusa kubinyabiziga by’imitende ibiri ', 'kunyuranaho ibumoso birabujijwe ', 'a na b ni ibisubizo by’ukuri ', 'C', '360_F_655773389_rwIzhjZ2gYv1LxIWCDq5ZiVOLCQnXuOg.jpg'),
(53, 'Mu gihe cy’impanuka mu muhanda\r\nn’ubundi bushotoranyi ni yihe nimero ya\r\ntelefone y’ubutabazi wahamagara :\r\n', '911', '100', '112', '131', 'C', '3XAX7JDBFRAR3DIENJAY7XWY64.webp'),
(54, 'Ikindi kinyabiziga kiguturutse inyuma\r\nkiguterera amatara y’urumuri rumyasa,\r\nwakora iki?', 'Kongera umuvuduko kugira ngo intera iri hagati yawe n’ukuri inyuma igumeho', 'Fata feri y’urugendo kugira ngo umwereke ko ugiye guhagarara', 'Emerera icyo kinyabiziga kugutambukaho niba imbere ntacyago gihari', 'Nta gisubizo cy’ukuri kirimo', 'C', NULL),
(55, 'Amatara y’urugendo, mu gihe cy’ibihu:\r\n', 'Ni meza kuko atuma ureba kure', 'Ni mabi kuko arakugarukira akaguhuma amaso', 'Akwizeza ko abandi bakubona', 'Nta gisubizo cy’ukuri', 'B', NULL),
(56, 'Iyo mu muhanda hashushanyijemo\r\numurongo wera ucagaguye, ntugomba', 'Ntugomba kujya mu kindi gice cy’umuhanda', 'Ushobora kujya mu kindi gice cy’umuhanda bibaye ngombwa', 'Agomba guhagarika ikinyabiziga', 'Nta gisubizo cy’ukuri', 'B', NULL),
(57, 'Umuyobozi w’ikinyabiziga ugeze mu\r\nisangano ry’umuhanda ugenzurwa ni\r\nibimenyetso by’amatara yaka agasanga ataka\r\n(adakora), yakora iki?', 'Guca mu isangano n’ubwitonzi nkaho ntakimenyetso kikuyobora kirimo, witondera abandi bayobozi b’ibinyabiziga ', 'Gutwara neza ntagutinda mw’isangano', 'Guhagarara mw’isangano no guha inzira abayobozi b’ibinyabiziga baturuka iburyo bwawe ', 'Gucana amatara yose ndanga cyerekezo ugakomeza', 'A', NULL),
(58, 'Niryari amatara ndanga cyerekezo agomba\r\nkugaragazwa kubandi bakoresha umuhanda ?', 'igihe gusa ari ngombwa amenyesha ibindi binyabiziga bimukurikiye', 'igihe gusa aringombwa kuburira abandi bayobozi bava mukindi cyerekezo ', 'keretse ahari ibimenyetso byo mu muhanda byerekana icyerekezo cyawe ', 'mugihe gikwiye ushaka kumenyesha abandi bakoresha umuhanda icyo ugiye gukora', 'D', NULL),
(59, 'Ugeze mu masangano y’umuhanda aho\r\nusanga ibimenyetso bimurika bidakora, wakora\r\niki igihe umukozi ubifiye ububasha aguhaye iki\r\nkimenyesto ?', 'gukata ibumoso gusa', 'gukata iburyo gusa ugakomeza imbere', 'Guhagarara kumurongo wo guhagarara umwanya moto ', 'komeza imbere gusa', 'C', 'mqdefault.jpg'),
(60, 'Amatara ndangacyerekezo agomba\r\nkugaragara nijoro igihe ijuru rikeye mu ntera\r\nnibura ya:', 'm 100', 'm 200', 'm150', 'm250', 'C', NULL),
(61, 'Ibyapa bitegeka bikozwe muyihe\r\nshusho?', '1.png', '2.png', '3.jpg', '1014910.png', 'C', NULL),
(62, 'Mugihe ikinyabiziga cyacu bakinyuzeho', 'Tugomba kugabanya umuvuduko', 'Tugomba kongera umuvuduko', 'Tugomba kongera umuvuduko n’ubwitonzi', 'Nta gisubizo cy’ ukuri kirimo', 'A', NULL),
(63, 'Kuvuza ihoni bibujijwe:', 'Ku musigiti, ku rusengero, ku rutambiro', 'Hafi y’ibitaro', 'Hafi y’ubuyobozi bwa polisi', 'Nta gisubizo cy’ukuri', 'B', NULL),
(64, 'Icyemezo cy’Isuzuma ry’ikinyabiziga\r\nkimara igihe kingana iki?', 'Amezi 6 kubinyabiziga bikora ubucuruzi', 'Amezi 12 ku binyabiziga bidakora ubucuruzi', 'Imyaka 2', 'A na B ni ibisubizo by’ukuri', 'D', NULL),
(65, 'Niki umuyobozi w’ikinyabiziga yakora mu\r\ngihe abonye icyapa kiburira cya mpande eshatu\r\ngitukura mu muhanda?', 'Hagarara utegereze amabwiriza', 'Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko ateganya icyago imbere ye', 'Kukireka, ukagumana umuvuduko ufite ugakomeza', 'Hagarara kuri icyo cyapa cya mpande eshatu mbere yo gukomeza', 'B', NULL),
(66, 'iki cyapa gisobanura iki ?', 'Uburenganzira bwo gutambuka mbere', 'Nta kinyabiziga kigendeshwa na moteri', 'ibyerekezo bibiri by’umuhanda', 'Birabujijwe kunyuranaho', 'D', 'LT_road_sign_325.png'),
(67, 'Iki cyapa gisobanura iki?', 'Umuhanda uzenguruka', 'Igice cy’umuhanda uzenguruka', 'Aho banyura bazengurutse', 'Ibisubizo byose nibyo', 'C', '6.jpg'),
(68, 'Iki cyapa gisobanura iki?', 'Isangano rifite ishusho ya T', 'Inzira idakomeza', 'Aho baterefonera', 'Nta gisubizo cy’ukuri', 'B', '7.png'),
(69, 'Icyapa gitanga uburenganzira bwo gutambuka mbere kigira iyihe shusho?', '2.png', '9.jpg', '10.jpg', '11.jpg', 'D', NULL),
(70, 'Iki cyapa gisobanura iki?', 'Umuhanda wubatswe nabi', 'Agacuri kateza ibyago', 'Umuhanda utaringaniye', 'Akazamuko gahanamye', 'B', '12.jpg'),
(71, 'Ni iki gikenewe muri ibi bikurikira kugirango ubashe gutwara imodoka mu muhanda biteganywa nitegeko', 'Uruhushya rwa burundu rwo gutwara ibinyabiziga rugifite agaciro', 'Ubwishingizi bw’ikinyabizaga bugifite agaciro', 'Icyemezo cy’iyandikwa ry’ikinyabiziga', 'Ibisubizo byose nibyo', 'D', NULL),
(72, 'Telephone ngendanwa ntigomba gukoreshwa:', 'Ahari ibimenyetso bimurika', 'Igihe utwaye ikinyabiziga Ku muvuduko wa 20km/h', 'A na B ni ibisubizo by’ukuri', 'Nta gisubizo cy’ukuri', 'D', NULL),
(73, 'Iki cyapa gisobanura :', 'utubuye dutaruka mu muhanda', 'umuhanda urimo amazi', 'umuhanda unyerera', 'a na b ni bisubizo by’ukuri', 'A', NULL),
(74, 'Iki cyapa gisobanura :', 'utubuye dutaruka mu muhanda', 'umuhanda urimo amazi', 'umuhanda unyerera', 'a na b ni bisubizo by’ukuri', 'A', '13.png'),
(75, 'Iki cyapa kibuza kunyuranaho ibumoso ku binyabiziga bikurikira :', 'ku binyabiziga byose', 'ku binyabiziga byose bifite moteri', 'kubinyabiziga byose uretse ibinyamitende ibiri n’amapikipiki adafite akanyabiziga ko k’uruhande', 'nta gisubizo cy’ukuri kirimo', 'C', NULL),
(76, ' Iki cyapa kibuza kunyuranaho ibumoso ku binyabiziga bikurikira :', 'ku binyabiziga byose', 'ku binyabiziga byose bifite moteri', 'kubinyabiziga byose uretse ibinyamitende ibiri n’amapikipiki adafite akanyabiziga ko k’uruhande', 'nta gisubizo cy’ukuri kirimo', 'C', 'LT_road_sign_325.png'),
(77, 'iki cyapa kibuza abayobozi bibinyabiziga kunyuranaho :', 'iburyo', 'ibumoso', 'iburyo n’ibumoso', 'nta gisubizo cy’ukuri kirimo', 'B', 'LT_road_sign_325.png'),
(78, 'Mu muhanda ufite uruhererekane rw’amakoni, feri y’urugendo ikoreshwa ryari?', 'Mbere ya buri koni', 'Muri buri koni', 'Nyuma ya buri koni', 'Nta gisubizo cy’ukuri kirimo', 'A', 'France_road_sign_A1d.svg'),
(79, 'Niyihe mpamvu ituma tugomba kugabanya umuvuduko mugihe hari ibihu ?\r\n', 'Igihe feri idakora', 'Igihe uhumishijwe n’amatara yo kubisikana', 'Igihe moteri imara ngo izime', 'Nuko biba bitoroshye kubona ikiri imbere', 'D', NULL),
(80, 'Utwaye ikinyabiziga inyuma ya romoruki.umuyobozi wayo akaguha ikimenyetso cyo kumutambukaho iburyo kandi ugana ibumoso, wakora iki ?\r\n', 'Kugabanya umuvuduko ukareka akagenda', 'Gukomeza iburyo bwawe', 'Kumunyuraho iburyo bwe', 'Kugumana umuvuduko wari ufite ukamuvugiriza ihoni', 'A', NULL),
(81, 'Kumanywa urumuri rudahagije hatabona neza .Ni ayahe matara y’urugendo ugomba gukoresha.', 'Amatara yo kubisika na matara kamenabihu', 'Amatara kamena-bihu y’imbere', 'Amatara yo kubisikana', 'Amatara kamena-bihu y’inyuma', 'B', NULL),
(82, 'Wifuza kugana ibumoso imbere yawe. kubera iki ushaka umwanya mwiza kandi uhagije?\r\n', 'Kwemerera abandi bayobozi b’ibinyabiziga kugutambukaho', 'Kugirango ubone neza ikindi kerekezo ushaka gufata', 'Kugirango ufashe abandi bose bakoresha umuhanda icyo ushaka gukora', 'Kwemerera abandi bayobozi b’ibinyabiziga kukunyura muruhande rw’ibumoso', 'C', NULL),
(83, 'Utegereje gukata iburyo kwiherezo ry’umuhanda.ukingirijwe nimodoka ihagaze.niki wakora?', 'Guhagarara hanyuma ukagenda gake gake witonze kugezaho ureba neza.', 'Kwihuta wegera imbere aho ushobora kureba ugafunga ikindi cyerekezo.', 'Gutegereza abanyamaguru bakakumenyesha ko ntakibazo wakata', 'Guhindukiza imodoka vuba kugirango ushake indi nzira wakoresha.', 'A', NULL),
(84, 'Buri modoka cyangwa buri romoruki ikuruwe n’iyo modoka bishobora kugira itara risa n’icyatsi kibisi bituma umuyobozi yerekana ko yabonye ikimenyetso cy’uwitegura kumunyuraho. Iryo tara rigomba gushyirwa aha hakurikira:', 'hafi y’inguni y’ibumoso bw’ikinyabiziga', 'inyuma hafi y’impera y’ibumoso bw’ikinyabiziga', 'inyuma ahegereye inguni y’iburyo', 'nta gisubizo cy’ukuri kirimo', 'B', NULL),
(85, 'Ubugari bw’imizigo yikorewe n’ipikipiki ifite akanyabiziga ko kuruhande kimwe n’ubwa romoruki ikuruwe na bene icyo kinyabiziga ntibushobora kurenza ibipimo bikurikira ku bugari bw’icyo kinyabiziga kidapakiye:\r\n', 'm 1.25', 'cm 30', 'cm 75', 'nta gisubizo cy’ukuri kirim', 'B', NULL),
(86, 'Mu gihe telefone yawe ihamagawe utwaye imodoka wakora iki?', 'Kwitaba cyangwa guhagarara ako kanya', 'kutayitaba', 'Gushyira imodoka iruhande ukayitaba', 'B na c ni ibisubizo byukuri', 'C', NULL),
(87, 'Iki cyapa cyivuga iki?', 'Umuvuduko ntarengwa 30 km/h', 'Iherezo ry’umuvuduko muke ntarengwa utegetswe.', 'Iherezo ry’Umuvuduko muto utegetswe', 'Umuvuduko uri hejuru 30 km/h', 'B', 'o2p66QzBp7Z7CJtNJ8c-9w.jpg'),
(88, 'Niki ugomba gukora igihe uhagaze ku muhanda igihe cy’ibihu?', 'Kureka amatara ndanga akaguma yaka', 'Kureka amatara yo k,ubisikana na kamena-bihu akaguma yaka', 'Kureka amatara yo kubisikana akaguma yaka', 'Kureka amatara y’urugendo akaguma yak', 'A', NULL),
(89, 'Icyapa gikurikira kivuze iki?', 'Ntihanyurwa', 'Birabujijwe guhagarara umwanya munini', 'Umuvuduko utarengeje', 'Inzira yabanyeshuli', 'B', 'Vorschriftszeichen_13a.svg'),
(90, 'Iki cyapa gisobanura iki?', 'Umuyaga w’intambike', 'Urusaku rwo mu muhanda', 'Ikibuga cy’indege', 'Ibisubizko byose nibyo', 'A', 'images.png'),
(91, 'Imburira zimurika zemerewe gukoreshwa kugirango bamenyeshe umuyobozi ko bagiye kumunyuraho aha hakurikira:', 'mu nsisiro cyangwa ahandi hose', 'ahegereye inyamaswa zikurura', 'hafi y’amatungo', 'nta gisubizo cy’ukuri kirimo', 'A', NULL),
(92, 'Ikinyabiziga cyose cyangwa ibinyabiziga bigenda bigomba kugira:\r\n', 'Umuyobozi', 'Umuherekeza', 'A na B ni ibisubizo by’ukuri', 'Nta gisubizo cy’ukuri kirimo', 'A', NULL),
(93, 'Iki cyapa gisobanura iki?', 'Hanyurwa na velomoteri gusa', 'Nta modoka', 'Hanyurwa nimodoka gusa', 'Ntihanyurwa n’amapikipiki', 'D', 'Bild_14_-_Verkehrsverbot_fÃ¼r_KraftrÃ¤der,_StVO_1937.svg'),
(94, 'Mu bimenyetso bimurika itara ritukura rivuga iki ?', 'Hagarara kereste niba ushaka gukata ibumoso', 'Hagarara niba ubona ntabyago byaguteza', 'Birabujijwe kurenga icyo kimenyetso', 'Wemerewe kugenda niba aho asohokera mu masangano y’umuhanda hafunze', 'C', '360_F_416097206_SgKXI8mYDCEdlC3BL3bptHGtm80bE2sW.jpg'),
(95, 'Mubimenyetso bimurika itara ry’umuhondo risobanura iki ?\r\n', 'Itegure kugenda', 'Birabujijwe gutambuka umurongo wo guhagarara umwanya muto cg igihe uwo murongo udahari icyo kimenyetso ubwacyo', 'A na b ni ibisubizo by’ukuri', 'Nta gisubizo cy’ukuri kirimo', 'B', '360_F_416100290_r2XzSVbwXgKUi3ePErbI812HMcFG7T9p.jpg'),
(96, 'Mubimenyetso bimurika itara ry’icyatsi risobanura iki ?\r\n', 'Kwitegura kugenda', 'Uburenganzira bwo kurenga icyo kimenyetso', 'Hagarara niba inzira isohoka mu isangano ry’imihanda ifunze', 'Ntagisubizo cyukuri kirimo', 'B', '360_F_416099205_pMJ7GjjEoKQv1qjGh4nEvVw2pYIQhcaN.jpg'),
(97, 'Umurongo ucagaguye wera mu muhanda usobanura iki?\r\n', 'Birabujijwe kuwurenga', 'Birabujijwe kuhahagarara', 'Wegereye ahaguteza ibyago', 'Kunyuranaho ntibyemewe', 'A', 'centreline.png'),
(98, 'Iki cyapa gisobanura iki?', 'Ahatangirwa serivisi ni muri metero 30.', 'Umuvuduko munini ntarengwa utegetswe ni 30 km/h.', 'Umuvuduko muto ntarengwa utegetswe ni 30 km/h.', 'Aho ibinyabiziga bihagarara ni imbere mu birometero 30.', 'C', 'ef47397f84-450.webp'),
(99, 'Iki cyapa gisobanura iki?', 'Imbere hari umuyobozi w’amatungo.', 'Imbere hari inzira ya gari ya moshi.', 'Ahegereye amasangano y’inzira nyabagendwa n’inzira ya gari ya moshi hatabambiye', 'Inkomane ibambiye.', 'C', '31z7YYLJLzL.jpg'),
(100, 'Iki cyapa gisobanura iki?', 'Ahegereye umuhanda unyerera.', 'Imbere ipine ryapfumutse.', 'Ahegereye icyago kidasobanuye ukundi.', 'Imbere hari hatangirwa serivisi.', 'C', 'otherdangerahead.jpg'),
(101, 'Iki cyapa gisobanura iki?', 'Uguhinguka ku mwaro cyangwa ku nkombe cyangwa ahegereye icyome', 'Inzira nyabagendwa iri kumusozi ucuramye', 'Umuhanda utaringaniye', 'Umuhanda wangijwe n’isuri', 'A', 'Nepal_road_sign_B28.svg.png'),
(102, ' Iki cyapa gisobanura iki?', 'Ahegereye amasangano y’inzira nyabagendwa n’inzira ya gari ya moshi ibambiye', 'Inzira ibambiye imbere', 'Inzira itabambiye itanafunze', 'Imbere hari ikiraro cy’amatungo', 'A', 'Nepal_road_sign_B41.svg.png'),
(103, 'Iki cyapa gisobanura iki?', 'Ukugendera mu muhanda ubisikanirwamo', 'Ukugendera mu muhanda ubisikanirwamo ntibyemewe', 'Cyerekana aho umunyegare agomba kunyura', 'Nta gisubizo cy’ukuri kirimo', 'A', 'Belgian_traffic_sign_A39.svg.png'),
(104, 'Niki umuyobozi w’ikinyabiziga yakora igihe agize uruhare mu mpanuka yo mu muhanda , aho ntawakometese ariko\r\nibinyabiziga bikaba byateza icyago cyangwa byafunze umuhanda ?\r\n', 'Gushushanya aho zagonganiye no kuzishyira kuruhande', 'Gukuramo abagenze ugashyiraho icyapa cya mpandeshatu girukura kumodoka', 'Gutegereza ko abapolisi bahagera mbere yo gukura ibinyabiziga mu muhanda', 'Guhagarika ibindi binyabiziga kugeza ikibazo gikemutse mukabona kubikura mu muhanda', 'A', NULL),
(105, 'Igihe umuyobozi w’ikinyabiziga atwaye mu muhanda urombereje w’ibice byinshi agomba kugendera mu kihe gice cy’umuhanda ?\r\n', 'Kugendera mugice icyo aricyo cyose kirimo ibinyabiziga bike', 'Kugendera kugice cy’ibumoso keretse ushaka gusohokera iburyo', 'Kugendera mu gice cy’iburyo bw’umuhanda keretse ushaka kunyuranaho', 'Ntagutwarira mu ruhande rw’iburyo bw’umuhanda kuko hagenewe imodoka ziremereye n’imodoka nini zitwara abantu.', 'C', NULL),
(106, 'Ni ubuhe buryo bwiza bwakurikizwa igihe hari umuntu wakomerekeye mu mpanuka yo mu muhanda ?', 'Ku mushyira kunkengero y’umuhanda', 'Kutamukuramo keretse mugihe hari ibyago byaterwa n’inkogi y’umuriro cyangwa akaba ashobora kugongwa n’ikindi kinyabiziga no guhamagara ababishinzwe', 'Gusaba uwakomeretse kunyeganyeza ibice by’umubiri kugirano umenye aho ibikomere bye bigarukira', 'Guhumuriza uwakometse ukamuha ikinyobwo gikonje', 'B', NULL),
(107, 'Umuyobozi w’ikinyabiziga yakora iki igihe ageze aho banyura bazenguruka?', 'Tanga inzira ku binyabiziga byamaze kwinjira aho banyura bazunguruka', 'Tanga inzira kubinyabiziga biremereye gusa', 'Tanga inzira gusa niba uri munzira ya kabiri niya gatatu isohoka', 'Komeza kuko abandi bayobozi b’ibinyabiziga bagomba kuguha inzira yo gukomeza', 'A', NULL),
(108, 'Igihe umuyobozi w’ikinyabiziga agendera munzira y’icyerekezo kimwe akifuza gukata ibumoso yakora iki?\r\n', 'gutwara yegera umurongo wo hagati mu muhanda yerekeza ibumoso', 'gutwara yegera uruhande rw’iburyo bw’umuhanda', 'gutwara yegera ku uruhande rw’ibumoso bw’umuhanda', 'Gutwarira hafi y’umurongo ugabanya umuhanda mo kabili', 'C', NULL),
(109, 'Ni kihe cyerekezo umuyobozi w’ikinyabiziga yinjiriramo iyo ageze aho banyura bazenguruka ?', 'ibumoso', 'ibumoso gusa igihe ayobowe ni kimenyetso kimurika', 'iburyo cyangwa ibumoso', 'iburyo', 'D', NULL),
(110, 'Umuyobozi w’ikinyabiziga yakwitondera iki mbere yuko y’injira munzira banyuramo bazengurutse ?\r\n', 'ibinyabiziga bimuturuka inyuma umuvuduko bifite n’uburyo bimwegereye', 'ibinyabiziga biturutse ibumoso bwe n’umuvuduko bifite n’intera iri hagati ye nabyo', 'ibinyabiziga biturutse iburyo n’umuvuduko bifite ni intera iri hagati ye nabyo', 'ibinyabiziga bimututse imbere , umuvuduko bifite n’intera iri hagati ye nabyo', 'B', NULL),
(111, 'Umuyobozi w’ikinyabiziga ugendera inyuma y’ikinyabaziga gitwara abagenzi gihagaze gikuramo cyangwa gishyiramo abagenzi agomba :\r\n', 'kunyuranaho ibumoso', 'gutegereza yihanganye', 'a na b ni ibisubizo by’ukuri', 'nta gisubizo cy’ukuri kirimo', 'A', NULL),
(112, 'Igihe ubonye icyapa kigaragaza ishuli wakora iki?\r\n', 'kugabanya umuvuduko no gukomeza witonze', 'gukomeza n’umuvuduko uri hejuru kuko umunyeshuli agomba gutegereza', 'kuvuza ihoni', 'ibisubizo byose ni ukuri', 'A', NULL),
(113, 'Umubare w’abagenzi bemewe gutwarwa mukinyabiziga wanditswe mu :', 'icyemezo cy’iyandikwa ry’ikinyabiziga', 'inyemezabwishyu y’umusoro', 'ubwishingizi', 'ibisubizo byose ni ukuri', 'C', NULL),
(114, 'Gutwara ikinyabiziga wasinze:', 'biremewe kubinyabiziga byabikorera kugiti cyabo', 'biremewe nijoro', 'birabujijwe ku binyabiziga byose bifite moteri', 'ibisubizo byose nibyo', 'C', NULL),
(115, 'Mbere yuko umuyobozi w’ikinyabiziga akata ibumoso mu nzira nyabagendwa, nihe ikinyabiziga kigomba kuba kiri ?\r\n', 'Mu ruhande rw’iburyo bw’inzira nyabagendwa', 'Gusa iburyo bwo hagati y’inzira nyabagendwa', 'Muruhande urwarirwo rwo hagati mu nzira nyabagendwa', 'Mu ruhande rw’ibumoso bw’inzira nyabagendwa', 'B', '66.png'),
(116, 'Umuyobozi w’ikinyabizaga ashobora kunyuranaho:', 'ahamanuka', 'igihe umuhanda ari mugari', 'igihe umuyobozi w’ikinyabiziga kiri imbere ye amweretse ikimenyetso kimwemerera kunyuranaho', 'nta gisubizo cy’ukuri', 'C', NULL),
(117, 'Ugeze ahari inzira yabanyamaguru barindiriye kwambuka. Ntibatangiye kwambuka , wakora iki?', 'kuvuza ihoni', 'kwihangana ugatagereza', 'gukomeza', 'nta gisubizo cy’ukuri', 'B', NULL),
(118, 'Igihe utwaye umuntu mu kinyabiziga cyawe, akibagirwa kwambara umukandara wo kwirinda ibyago ugomba:\r\n', 'gukuramo umukandara wo kwirinda ibyago wambaye mukawambara mwembi', 'kubyerengagiza wizeyeko nta mpanuka muri bukore', 'funga cyane umukandara wo kwirinda ibyago wawe', 'Kubibutsa kwambara umukandara wo kwirinda ibyago', 'D', NULL),
(119, 'Igihe za otobisi zigenewe gutwara banyeshuli zihagaze kugirango zibafate cyangwa bavemo ugomba :', 'kuvuza ihoni ugakomeza', 'gukomeza ugabanyije umuvuduko n’ubwitonzi kuko bishoboka ko abanyeshuli bakwambuka bitunguranye', 'nta bwitonzi budasnzwe bukenewe', 'ibisubizo byose ni ukuri', 'B', NULL),
(120, 'Igihe imodoka iparitse ku nkengero z’umuhanda mugihe cy’ ijoro :', 'Imodoka igomba kuba ifunze', 'Umuntu ufite uruhushya rwo gutwara ikinyabiziga agomba kuba yicaye mu mwanya w’umuyobozi', 'Amatara yo guhagarara umwanya munini aguma yaka', 'Ibisubizo byose ni ukuri', 'C', NULL),
(121, 'Mu gihe hari undi muyobozi w’ikinyabiziga ugukurikiye watangiye kukunyuraho :', 'Ntugomba kugira undi muyobozi w’ikinyabiziga unyuraho', 'Ugomba kunyura ku kindi kinyabiziga', 'Ugomba kunyura kukindi kinyabiziga uvugije ihoni', 'Nta gisubizo cy’ukuri kirimo', 'A', NULL),
(122, 'Kuki abanyamaguru batemerewe kwambuka umuhanda mw’ikoni cyangwa hafi y’imodoka ihagaze?\r\n', 'ingaruka kubindi binyabiziga', 'ingaruka kubandi bakoresha umuhanda', 'Abandi bayobozi bi binyabiziga baza bashobora kutabona abambuka umuhanda', 'Ibisubizo byose ni ukuri', 'C', NULL),
(123, 'Utwaye ikinyabiziga mu muhanda ufite ibyerekezo bibiri .ikinyabiziga imbere yawe cyiragenda buhoro, imbere yawe umuhanda nta kibazo kunyuranaho, ugomba :\r\n', 'kucyinyuraho bikorewe ibumoso', 'kucyinyuraho bikorewe iburyo', 'kucyinyuraho ukoresheje uruhande urwo arirwo rwose', 'ibisubizo byose ni ukuri', 'A', NULL),
(124, 'Ibice by’umuhanda byera bigari biteganye n’umurongo ugabanya umuhanda mo ,kabiri bisobanura:', 'guhagara kw’ikinyabiziga', 'aho abanyamaguru bambukira', 'guha ubushobozi binyabiziga', 'ibisubizo byose ni ukuri', 'B', NULL),
(125, 'Kunyuranaho mw’ikoni :', 'biremewe', 'ntibyemewe', 'biremewe ukoranye ubwitonzi', 'ibisubizo byose ni ukuri', 'B', NULL),
(126, 'Uturebanyuma dukoreshwa:', 'kwireba', 'kugenzura ibigendera mu muhanda inyuma', 'kureba abicaye inyuma', 'ntagisubizo cy’ukuri', 'B', NULL),
(127, 'Umuyobozi w’ikinyabiziga igihe atwaye ikinyabiziga akagira umunaniro utuma yasinzira yakora iki ?', 'Gufungura ikirahure cy’ikinyabiziga cyangwa gushyira ubukonje mu modoka kugirango umwuka mwiza winjire mu kinyabiziga', 'Guhagarara akaruhuka harimo no kugendagenda niba bishoboka', 'Kunanura amaboko no gufunga amaso mugihe gito', 'Kongera ubushyuhe mu kinyabiziga', 'B', NULL),
(128, 'Niki umuyobozi w’ikinyabiziga yakora igihe atwaye ikinyabiziga mugihe cy’ibihu,imvura nyinshi, umwuzure cyangwa umukungugu mwinshi ?', 'Kugendera mu tuyira turi kumpande zu muhanda, ucunga ibimenyetso bigarura urumuri', 'Kugabanya umuvuduko hanyuma ugakoresha amatara magufi', 'Gucana amatara maremare hanyuma ukagenda gahoro', 'Kugendera mu murongo ugabanya umuhanda mo kabiri unareba ibimenyestso by’umuhanda bigarura urumuri', 'B', NULL),
(129, 'Muri ibi byapa ni ubuhe bwoko bw’ibyapa bitegeka byo mu muhanda?', 'ibiri mw’ishusho y’urukiramende n’umuzenguruko w’umuhondo', 'ibiri mw’ishusho ya mpande eshatu mu n’uzenguruko mw’ibara ry’ubururu', 'ibiri mw’ishusho y’uruziga n’umuzenguruko mw’ibara ry’umutuku', 'ibiri mw’ishusho ya mpande enye zingana mubuso bw’umukara', 'C', NULL),
(130, 'Igice cy’inzira nyabagendwa kigarukira kumirongo ibiri yera icagaguye ibangikanye kandi gifite ubugari budahagije kugirango imodoka zitambuke neza kiba ari:\r\n', 'Inzira y’abanyamaguru', 'Agahanda k’amagare', 'a na b byose ni ukuri', 'Nta gisubizo cy’ukuri kirimo', 'B', NULL),
(131, 'Icyapa kimenyesha kugendera mu muhanda ubisikanirwamo gifite:', 'Ishusho y’uruziga mw’ibara ritukura, ubuso bwera n’ikirango cy’umukara', 'Ishusho ya mpandeshatu mw’ibara ritukura, ubuso bwera n’ikirango cy’umukara', 'Ishusho ya mpandeshatu mw’ibara ritukura, ubuso bw’ubururu n’ikirango cy’umukara', 'Ishusho y’uruziga mw’ibara ritukura, ubuso bw’ubururu n’ikirango cy’umukara', 'B', NULL),
(132, 'Iki cyapa kivuga:', 'Aho imihanda ihurira', 'inkomane y’aho umuhanda umwe urasukira iburyo', 'a na b ni ibisubizo by’ukuri', 'nta gisubizo cy’ukuri kirimo', 'D', 'CH-Gefahrensignal-Engpass.svg.png'),
(133, 'Iki cyapa gisobanura ibi bikurikira:', 'birabujijwe kunyura ku kindi kinyabiziga', 'gutambuka mbere kw’ibinyabiziga bituruka aho ujya', 'a na b ni ibisubizo by’ukuri', 'nta gisubizo cyukuri kirimo', 'B', 'P07_CZ.svg.png'),
(134, 'Ikinyabiziga kigendeshwa na moteri n’ikinyabiziga gikururwa n’inyamaswa ntibishobora gukurura :', 'Ibinyabiziga birenze kimwe', 'Ibinyabiziga bipakiye birenze bibiri', 'Ibinyabiziga birenze bibiri', 'b na c ni byo', 'C', NULL),
(135, 'Utugarurarumuri turi ku ruhande rw’imbere rw’ikinyabiziga tugomba gusa:', 'n’umuhondo', 'n’umutuku', 'n’umweru', 'nta gisubizo cy’ukuri kirimo', 'C', NULL),
(136, 'Iki cyapa kivuga:', 'iherezo ryo gutambuka mbere', 'gutambuka mbere kw’ibinyabiziga biturutse imbere aho ujya', 'gutambuka mbere y’ibinyabiziga biturutse imbere', 'nta gisubizo cy’ukuri kirimo', 'C', 'Portugal_road_sign_B6.svg.png'),
(137, 'Iki cyapa kigizwe:', 'ishusho mpandeshatu ,ubuso ubururu', 'ishusho mpandeshatu,ubuso umukara', 'ishusho mpandeshatu,ubuso umweru', 'nta gisubizo cy’ukuri', 'C', 'external-road-traffic-road-signs-those-icons-lineal-those-icons-1.jpg'),
(138, 'Iki cyapa kivuga:', 'ifungana ry’umuhanda iburyo', 'ifungana ry’umuhanda w’akayira gasatira umuhanda ibumoso', 'akayira gato', 'nta gisubizo cy’ukuri', 'B', 'Gefahrenzeichen_8b.svg.png'),
(139, 'Umuyobozi ubonye ko hari undi umukurikiye ashaka kumunyuraho agomba kubahiriza ibi bikurikira :\r\n', 'kwegera i ruhande rw’iburyo bw’umuhanda', 'kongera umuvuduko', 'guhagarara', 'a na c ni byo bisubizo by’ukuri', 'A', NULL),
(140, 'Iki cyapa cyerekana :', 'ifungana ry’umuhanda', 'ifungana ry’umuhanda n’akayira gasatira umuhanda i bumoso', 'umuhanda utaringaniye', 'nta gisubizo cy’ukuri kirimo', 'D', 'SA_road_sign_-_Road_narrows_on_the_right.svg.png'),
(141, 'Icyi cyapa cyerekana :', 'Ifungana ry’umuhanda', 'umuhanda unyerera', 'umuhanda utaringaniye', 'nta gisubizo cy’ukuri kirimo', 'D', 'otherdangerahead.jpg'),
(142, 'Icyi cyapa gisobanura :', 'ntihanyurwa mu byerekezo byombi', 'ntihanyurwa n’abandi uretse abahatuye', 'hanyurwa mu cyerekezo kimwe gusa', 'nta gisubizo cy’ukuri kirimo', 'A', '9.jpg'),
(143, 'Iki cyapa kivuga:', 'ikoni iburyo', 'akazamuko gashinze cyane', 'akamanuko gashobora gutera ibyago', 'b na c byose ni ukuri', 'A', 'saga-tehlikeli-viraj-levhasi-tehlike-uyari-levhasi-yol-trafik-tabelasi-40-cm-60-cm-75-cm-90-cm-normal-performans-yuksek-performans-levha-fiyati-imalati-uretimi-t-1a-500x500.jpg'),
(144, 'Iyo umuhanda ugabanijemo ibisate bibiri kandi ugendwamo mu byerekezo byombi umuyobozi abujijwe :\r\n', 'kugendera mu gisate cy’iburyo', 'kunyuranaho', 'kugendera mu gisate cy’ibumoso', 'ibisubizo byose ni byo', 'C', NULL),
(145, 'Icyapa cyerekana inzira y’amatungo itegetswe giteye:\r\n', 'Uruziga mubuso bw’ubururu, ishusho y’inka mu ibara ry’umukara', 'Uruziga mu ibara ryera, ishusho y’inka mwibara ry’ubururu', 'Uruziga mu buso bw’ibara ry’ubururu, ishusho y’inka mu ibara ryera n’ikirango cy’umukara', 'mpande eshatu mu buso bw’ibara ry’umweru n’ishusho y’inka mu ibara ry’umukara', 'D', NULL),
(146, 'Icyapa cyerekana ko bibujijwe kuvuza amahoni kirangwa na :\r\n', 'ishusho y’uruziga, ubuso bw’ubururu, ikiranga cy’umukara', 'ishusho y’uruziga, ubuso bw’ubururu, ikiranga cy’umweru', 'ishusho y’uruziga, ubuso bw’umweru, ikiranga cy’umukara', 'ntagisubizi cy’ukuri kirimo', 'C', NULL),
(147, 'Ibyapa biburira nibyo gutambuka mbere birangwa:', 'ishusho mpandeshatu mw’ibara ritukura , ubuso bwera n’ ikiranga mu ibara ry’umukara', 'ishusho mpandeshatu mw’ibara ritukura,ubuso bw’ubururu n’ikiranga mu ibara ry’umukara', 'ishusho y’uruziga mw’ibara ritukura,ubuso bw’ubururu n’ikiranga mu ibara ry’umukara', 'ishusho y’uruziga mw’ibara ritukura,ubuso bwera n’ikiranga mu ibara ry’umukara', 'A', NULL),
(148, 'Ibyapa bibuza n’ibitegeka bikurikizwa gusa:', 'Mumasangano', 'mu bimenyetso bimurika', 'a na b ni ibisubizo by’ukuri', 'nta gisubizo cy’ukuri kirimo', 'D', NULL),
(149, 'Ibyapa biburira bibereyeho kumenyesha umugenzi :', 'ko hari icyago', 'icyago kidasobanuye ukundi', 'imiterere y’icyago gitunguranye', 'nta gisubizo cy’ukuri kirimo', 'A', NULL),
(150, 'Ibyapa by’inyongera bishobora kumenyesha. ', 'ibitegetswe byihariye gusa', 'ubugerure cyangwa amarengamategeko rusange cyangwa ibibujijwe ndetse n’ibitegetswe byihariye', 'a na b ni ibisubizo by’ukuri', 'nta gisubizo cy’ukuri kirimo', 'B', NULL),
(151, 'Ishusho y’icyapa kivuga’’ugukikira”bitegetswe ni :', 'mpandeshatu', 'uruziga', 'urukiramende', 'nta gisubizo cy’ukuri kirimo', 'B', NULL),
(152, 'Icyapa kivuga “icyerekezo gitegetswe”kigizwe n’ikirango cy’ibara :', 'umweru', 'umutuku', 'ubururu n’ikirango cy’umweru', 'umukara', 'C', NULL),
(153, 'Iki kimenyetso gitanzwe n’umukozi ubifitiye ububasha cyo guhagarara :\r\n', 'ku bakoresha umuhanda ba muturutse imbere', 'ku bakoresha umuhanda bose bamuturutse imbere n’inyuma', 'kubakoresha umuhanda bose bamuturutse inyuma', 'nta gisubizo cy’ukuri kirimo', 'B', '88.png'),
(154, 'Ibi byapa byo mu muhanda birambuza kunyuranaho ibumoso ?', 'yego', 'yego, iyo ufite umuvuduo wa 90km/h', 'oya', 'ntagisubizo cy’ukuri', 'A', '77.png'),
(155, 'Umuhanda urombereje w’ibice byinshi. Ndashaka kunyura kuri izi kamyo ebyiri mugihe gito ibumoso icyarimwe , biremewe ?', 'yego', 'oya', 'yego bikorewe ibumoso', 'ntagisubizo cy’ukuri', 'B', '78.png'),
(156, 'Iki cyapa gisobanura iki mu nkomane ?', 'Tanga inzira ku binyabiziga binini', 'Gabanya umuvuduko uhe inzira abanyamaguru', 'Tanga inzira ku binyabiziga bigenda mu muhanda munini wegera', 'Tanga inzira ku ibinyabiziga biturutse iburyo bwawe', 'C', '11.jpg'),
(157, 'Iki cyapa gisobanura iki ?', 'Umuhanda urombereje w’ibice byinshi ibumoso', 'Umuhanda uyoborejwe i bumoso', 'Ibinyabiziga biturutse iburyo bifite uburenganzira bwo gutambuka mbere', 'Kata i bumoso gusa', 'D', 'Mauritius_Road_Signs_-_Mandatory_Sign_-_Left_turn_only.svg.png'),
(158, 'Iki cyapa gisobanura iki ?', 'Ntihasohokerwa i bumoso mu nzira banyuramo bazengurutse', 'Umuhanda udakomeza ibumoso', 'Nta nkengero y’umuhanda yegutse iri ibumoso', 'Birabujijwe gukata ibumoso', 'D', 'Philippines_road_sign_R3-14.svg.png'),
(159, 'Iki cyapa gisobanura iki ?', 'Kunyuranaho bikorerwa i buryo gusa', 'Umuhanda uyoborejwe i buryo', 'Kata i buryo gusa', 'Umuhanda munini urasukira i bumoso', 'C', 'Mauritius_Road_Signs_-_Mandatory_Sign_-_Right_turn_only.svg.png'),
(160, 'Iki cyapa gisobanura iki ?', 'Birabujijwe guhindukira', 'Birabijijwe gusubira inyuma', 'Umuhanda unyerera imbere', 'Ntibyemewe kugendera mu byerekezo byombi', 'A', 'images_(3).png'),
(161, 'Iki cyapa gisobanura iki ?', 'Umuhanda urombereje w’ibice byinshi ku birometero 50', 'Intera nto ntarengwa ya metero 50 hagati y’ibinyabiziga', 'Umuvuduko urenga ibirometero 50 mu isaha', 'Umuvuduko ntarengwa ugarukira ku birometero 50 mu isaha', 'D', 'road-sign-of-50-speed-limit-on-white-background-free-vector.jpg'),
(162, 'Iki cyapa gisobanura iki ?', 'Birabujijwe gukata i buryo', 'Tanga inzira ku bindi binyabiziga bigenda mu gihe ugiye gukatira iburyo', 'Kata i buryo mu gihe nta bindi binyabiziga biturutse mu kindi cyerekezo', 'Nta nkengero y’umuhanda yegutse iri i buryo', 'A', 'IE_road_sign_RUS-012_(1).svg');

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=163;

--
-- AUTO_INCREMENT for table `portal_admins`
--
ALTER TABLE `portal_admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
