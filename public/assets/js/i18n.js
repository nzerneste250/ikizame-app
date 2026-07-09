// IKIZAME — shared language switcher
(function () {
    const T = {
        rw: {
            // navbar links
            nav_home: 'Ahabanza', nav_help: 'Ubufasha', nav_resources: 'Imfashanyigisho',
            nav_pricing: 'Ibiciro', nav_school: 'Amashuri (School Portal)', nav_scores: 'Amanota',
            // index hero
            hero_pill1: 'Isuzuma Rihuse', hero_pill2: 'Amategeko 2026',
            hero_h1: 'Iga, Isuzume,', hero_h1_em: 'Utsinde', hero_h1_end: 'Ikizamini!',
            hero_desc: "Ikizame ni urubuga rugufasha kwiga amategeko y'umuhanda no gukora imyitozo y'ikizamini cy'uruhushya rwo gutwara imodoka mu Rwanda — vuba, neza, kandi ukoresheje telefone yawe.",
            hero_cta: 'Reba Uko Bigenda',
            // reg card
            card_title: 'Tangira Ikizamini',
            card_sub: "Injiza amazina yawe n'inomero ya telefone kugira ngo utangire ikizamini cy'amategeko y'umuhanda.",
            label_name: 'Amazina Yanyu', ph_name: 'Urugero: Irakoze Felix',
            hint_name: 'Andika amazina yanyu yose',
            label_phone: 'Numero ya Telefone', ph_phone: '0788000000',
            hint_phone: 'Tangira na 0 (Inimero 10 gusa, urugero: 0788000000)',
            btn_start: 'Tangira Ikizamini',
            // guide modal
            guide_title: 'Uko IKIZAME Ikora',
            guide_sub: 'Inzira yose kuva gutangira kugeza kureba amanota yawe',
            // exam score
            score_label: 'Amanota wagize:',
            verdict_pass: 'WATSINZE', verdict_fail: 'WATSINZWE',
            btn_review: 'Reba ibisubizo', btn_home: 'Jya Ahabanza',
            // exam result banner
            result_banner: "IBYAVUYE MU KIZAMINI CYAWE",
            result_sub: "Ikizamini cy'Inzira",
            lbl_name: 'Amazina', lbl_score: 'Amanota', lbl_phone: 'Telefoni',
            lbl_time: 'Igihe cyakorewe', lbl_correct: 'WASUBIJE NEZA',
            lbl_wrong: 'WASUBIJE NABI', lbl_skipped: 'BIDASUBIWE',
            btn_back_home: 'Subira Ahabanza', lbl_all_q: "Ibibazo Byose n'Ibisubizo Byazo",
            btn_top: 'Subira Hejuru',
            // amanota page
            lookup_title: 'Reba Amanota Yawe',
            lookup_desc: 'Injiza numero ya telefoni yakoreshejwe mu kizamini kugira ngo urebe amateka yawe yose.',
            lookup_label: 'Numero ya Telefoni', lookup_ph: '0780 000 000',
            lookup_hint: 'Injiza imibare 10 gutangira na 072, 073, 078 cyangwa 079',
            lookup_btn: 'Shakisha Amanota',
            // ubufasha
            help_hero_pill: 'Twandikire · Turakwitabira',
            help_hero_h1: 'Dufashe Gukora', help_hero_span: 'Ikizamini Neza',
            help_hero_p: 'Ufite ikibazo? Twandikire kuri WhatsApp cyangwa utubone ku mbuga nkoranyambaga. Turakwitabira vuba kandi neza.',
            help_human: "Ubufasha bw'abantu nyabo, si AI.",
            help_247_badge: '24 / 7',
            help_247_title: 'Ubufasha buhari igihe cyose.',
            help_247_desc: "Turakwitabira ku masaha yose — ku manywa, nijoro, n'iminsi y'ikiruhuko.",
            help_contact_title: 'Tutuganire',
            help_wa_badge: 'Arasubiza vuba', help_follow: 'Dukurikire', help_online: '● Arahari 24/7', help_phone_title: 'Telefoni',
            help_steps_title: "Intambwe z'Ikizamini",
            help_s1_title: 'Kwiyandikisha', help_s1_p: "Injiza amazina yawe yose n'inomero ya telefone itangira na 078 / 079 / 073 kuri paji ya mbere.",
            help_s2_title: 'Igenzura rya Konti', help_s2_p: "Sisitemu igenzura niba ufite inshuro z'ibizamini. Niba ari ntabwo, ujye ku Ibiciro ugure ukoresheje MoMo.",
            help_s3_title: 'Gukora Ikizamini', help_s3_p: "Subiza ibibazo 20 by'amategeko y'umuhanda mu minota 20. Buri kibazo gifite ishusho cyangwa imvugo.",
            help_s4_title: 'Amanota & Ibisubizo', help_s4_p: "Nyuma yo gusoza, amanota yawe agaragara ako kanya hamwe n'ibisubizo byose birambuye.",
            help_faq_title: 'Ibibazo Bikunze Kubazwa',
            help_faq1_q: 'Ikizamini cya mbere ni ubuntu?', help_faq1_a: "Yego, umukandida mushya ahabwa ikizamini kimwe cy'ubuntu. Nyuma y'icyo, agomba kugura inshuro zo gukomeza.",
            help_faq2_q: 'Nishyura gute ikizamini?', help_faq2_a: "Ujye ku gice cy'Ibiciro, hitamo package, hanyuma wishyure ukoresheje MTN MoMo cyangwa Airtel Money. Inshuro zifunguka ako kanya.",
            help_faq3_q: 'Nshobora kureba amanota yanjye nyuma?', help_faq3_a: "Yego. Jya ku gice cy'Amanota, injiza inomero ya telefone yawe, ubone amanota y'ibizamini byose wakoze.",
            help_faq4_q: 'Ishuri ryanjye rishobora gukoresha IKIZAME?', help_faq4_a: "Yego. Amashuri y'abatwara imodoka ashobora kwiyandikisha kuri School Portal kugira ngo akurikire abanyeshuri bayo.",
            help_faq5_q: 'Nifuza ubufasha bwihuse, nkore iki?', help_faq5_a: 'Twandikire kuri WhatsApp kuri 0786 663 377. Turakwitabira mu gihe gito.',
            // ifashanyigisho
            res_hero_h1: "Imfashanyigisho z'Amategeko",
            res_hero_p: "Soma no gukura inyandiko z'amategeko y'umuhanda zikubiye hano kugirango witegure ikizamini cyawe neza.",
            res_search_ph: 'Shakisha inyandiko...',
            res_read_btn: 'Soma Hano', res_dl_btn: 'Gukura',
            // ibiciro
            pricing_h2: 'Gura Ibizamini Byoroshye kandi Bihendutse',
            pricing_p: "Urahawe uburyo bwihuse bwo kugura amasomo y'ikizamini, kureba ibisigaye ku nomero yawe, no kwishyura ukoresheje MTN MoMo cyangwa Airtel Money.",
            // exam page
            exam_timer_label: 'IGIHE MUSIGARANYE:',
            exam_prev: '← Inyuma', exam_next: 'Komeza →', exam_finish: 'Soza Ikizamini ✓',
            exam_confirm: 'Ese koko urashaka gusoza ikizami?',
            exam_no: 'Oya', exam_yes: 'Yego, Soza',
            footer_copy: '© 2026 IKIZAME — Developed by Dotado Stationery Store Ltd',
            // exam page JS
            exam_next_btn: 'Komeza →', exam_finish_btn: 'Soza Ikizamini ✓',
            // exam-score JS
            score_label: 'Amanota wagize:', verdict_pass: 'WATSINZE', verdict_fail: 'WATSINZWE',
            // exam-result JS
            result_progress_lbl: 'Amanota yawe',
            result_pill_pass: 'YATSINZE', result_pill_fail: 'NTIYATSINZE',
            result_q_label: 'Ikibazo cya',
            result_badge_correct: 'WAGIKOZE NEZA', result_badge_wrong: 'WAGISUBIJE NABI', result_badge_skip: 'WASIMBUTSE',
            // ifashanyigisho JS
            res_read_btn: 'Soma Hano', res_dl_btn: 'Gukura',
        },
        en: {
            nav_home: 'Home', nav_help: 'Help', nav_resources: 'Resources',
            nav_pricing: 'Pricing', nav_school: 'Schools (School Portal)', nav_scores: 'My Scores',
            hero_pill1: 'Quick Practice', hero_pill2: 'Traffic Laws 2026',
            hero_h1: 'Learn, Practice,', hero_h1_em: 'Pass', hero_h1_end: 'Your Exam!',
            hero_desc: "IKIZAME helps you study Rwanda's traffic laws and practice driving licence exam questions — fast, easy, and right from your phone.",
            hero_cta: 'See How It Works',
            card_title: 'Start Exam',
            card_sub: 'Enter your name and phone number to begin the traffic law exam.',
            label_name: 'Full Name', ph_name: 'e.g. Irakoze Felix',
            hint_name: 'Enter your full name',
            label_phone: 'Phone Number', ph_phone: '0788000000',
            hint_phone: 'Start with 0 (10 digits only, e.g. 0788000000)',
            btn_start: 'Start Exam',
            guide_title: 'How IKIZAME Works',
            guide_sub: 'Step by step from registration to viewing your results',
            score_label: 'Your score:',
            verdict_pass: 'PASSED', verdict_fail: 'FAILED',
            btn_review: 'View answers', btn_home: 'Go Home',
            result_banner: 'YOUR EXAM RESULTS',
            result_sub: "Driving Licence Exam",
            lbl_name: 'Name', lbl_score: 'Score', lbl_phone: 'Phone',
            lbl_time: 'Date & Time', lbl_correct: 'CORRECT',
            lbl_wrong: 'WRONG', lbl_skipped: 'SKIPPED',
            btn_back_home: 'Back to Home', lbl_all_q: 'All Questions & Answers',
            btn_top: 'Back to Top',
            lookup_title: 'View My Scores',
            lookup_desc: 'Enter the phone number used during the exam to view all your results.',
            lookup_label: 'Phone Number', lookup_ph: '0780 000 000',
            lookup_hint: 'Enter 10 digits starting with 072, 073, 078 or 079',
            lookup_btn: 'Search Scores',
            help_hero_pill: 'Contact Us · We Respond Fast',
            help_hero_h1: 'We Are Here', help_hero_span: 'To Help You',
            help_hero_p: 'Have a question? Contact us on WhatsApp or social media. We respond quickly.',
            help_human: 'Real human support, not AI.',
            help_247_badge: '24 / 7',
            help_247_title: 'Support available anytime.',
            help_247_desc: 'We respond at all hours — morning, night, and weekends.',
            help_contact_title: 'Get In Touch',
            help_wa_badge: 'Responds fast', help_follow: 'Follow us', help_online: '● Available 24/7', help_phone_title: 'Phone',
            help_steps_title: 'How The Exam Works',
            help_s1_title: 'Register', help_s1_p: 'Enter your full name and phone number starting with 078 / 079 / 073 on the home page.',
            help_s2_title: 'Account Check', help_s2_p: 'The system checks if you have exam attempts. If not, go to Pricing and buy using MoMo.',
            help_s3_title: 'Take the Exam', help_s3_p: 'Answer 20 traffic law questions in 20 minutes. Each question may have an image or text.',
            help_s4_title: 'Scores & Results', help_s4_p: 'After finishing, your score appears instantly with full answer breakdown.',
            help_faq_title: 'Frequently Asked Questions',
            help_faq1_q: 'Is the first exam free?', help_faq1_a: 'Yes, new users get one free exam attempt. After that, you need to purchase more attempts.',
            help_faq2_q: 'How do I pay for the exam?', help_faq2_a: 'Go to the Pricing page, choose a package, and pay via MTN MoMo or Airtel Money. Attempts unlock instantly.',
            help_faq3_q: 'Can I view my scores later?', help_faq3_a: 'Yes. Go to the Scores page, enter your phone number, and see all your exam history.',
            help_faq4_q: 'Can my driving school use IKIZAME?', help_faq4_a: 'Yes. Driving schools can register on the School Portal to track their students.',
            help_faq5_q: 'I need urgent help, what do I do?', help_faq5_a: 'Message us on WhatsApp at 0786 663 377. We respond quickly.',
            res_hero_h1: 'Study Resources',
            res_hero_p: 'Read and download traffic law documents to prepare for your exam.',
            res_search_ph: 'Search documents...',
            res_read_btn: 'Read Now', res_dl_btn: 'Download',
            pricing_h2: 'Buy Exam Attempts — Simple & Affordable',
            pricing_p: 'Get quick access to exam attempts, check your balance, and pay via MTN MoMo or Airtel Money.',
            exam_timer_label: 'TIME REMAINING:',
            exam_prev: '← Back', exam_next: 'Next →', exam_finish: 'Finish Exam ✓',
            exam_confirm: 'Are you sure you want to submit the exam?',
            exam_no: 'Cancel', exam_yes: 'Yes, Submit',
            footer_copy: '© 2026 IKIZAME — Developed by Dotado Stationery Store Ltd',
            exam_next_btn: 'Next →', exam_finish_btn: 'Finish Exam ✓',
            score_label: 'Your score:', verdict_pass: 'PASSED', verdict_fail: 'FAILED',
            result_progress_lbl: 'Your score',
            result_pill_pass: 'PASSED', result_pill_fail: 'FAILED',
            result_q_label: 'Question',
            result_badge_correct: 'CORRECT', result_badge_wrong: 'WRONG', result_badge_skip: 'SKIPPED',
            res_read_btn: 'Read Now', res_dl_btn: 'Download',
        }
    };

    // English flag SVG inline
    const FLAGS = {
        rw: `<svg class="lang-flag" viewBox="0 0 4 3"><rect width="4" height="1.1" y="0" fill="#1EB5E5"/><rect width="4" height="0.9" y="1.1" fill="#FAD201"/><rect width="4" height="0.9" y="2" fill="#20603D"/><circle cx="3.1" cy="0.55" r="0.28" fill="#FAD201"/></svg>`,
        en: `<svg class="lang-flag" viewBox="0 0 60 30"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></svg>`
    };

    function getLang() { return localStorage.getItem('ikizame_lang') || 'rw'; }
    function setLang(l) { localStorage.setItem('ikizame_lang', l); }

    function applyLang(lang) {
        const t = T[lang];
        if (!t) return;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key] === undefined) return;
            // Only set textContent if element has no child elements (preserve inner HTML like <strong>)
            if (el.children.length === 0) {
                el.textContent = t[key];
            }
        });
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const key = el.getAttribute('data-i18n-ph');
            if (t[key] !== undefined) el.placeholder = t[key];
        });
        // Update all lang badges on page
        document.querySelectorAll('.lang-badge').forEach(badge => {
            badge.innerHTML = `${FLAGS[lang]}<span>${lang === 'rw' ? 'Kinyarwanda' : 'English'}</span>`;
            badge.style.cursor = 'pointer';
            badge.onclick = window.ikizameSwitchLang;
        });
        document.documentElement.lang = lang === 'rw' ? 'rw' : 'en';
    }

    window.ikizameSwitchLang = function () {
        const next = getLang() === 'rw' ? 'en' : 'rw';
        setLang(next);
        applyLang(next);
    };

    // Always wait for DOM — script is now in <head>
    document.addEventListener('DOMContentLoaded', () => applyLang(getLang()));
    window.ikizameApplyLang = applyLang;
    window.ikizameGetLang = getLang;
})();
