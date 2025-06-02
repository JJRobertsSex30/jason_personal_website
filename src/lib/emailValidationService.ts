// src/lib/emailValidationService.ts

// Common disposable email domains (you can expand this list)
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  '2prong.com',
  '30minutemail.com',
  '3d-game.com',
  '4warding.com',
  '7tags.com',
  'guerrillamail.com',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'mailinator.com',
  'mailinator.net',
  'mailinator.org',
  'tempmail.org',
  'temp-mail.org',
  'temporary-mail.net',
  'throwaway.email',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  '33mail.com',
  'amilegit.com',
  'anonbox.net',
  'anonymbox.com',
  'antichef.com',
  'antichef.net',
  'antispam.de',
  'binkmail.com',
  'bio-muesli.net',
  'bobmail.info',
  'bodhi.lawlita.com',
  'bofthew.com',
  'breakthru.com',
  'bulkmail.cf',
  'cem.net',
  'centermail.com',
  'centermail.net',
  'chogmail.com',
  'cool.fr.nf',
  'correo.blogos.net',
  'cosmorph.com',
  'courriel.fr.nf',
  'courrieltemporaire.com',
  'curryworld.de',
  'cust.in',
  'dacoolest.com',
  'dandikmail.com',
  'deadaddress.com',
  'despam.it',
  'despammed.com',
  'devnullmail.com',
  'dfgh.net',
  'digitalsanctuary.com',
  'discardmail.com',
  'discardmail.de',
  'disposableaddress.com',
  'disposableemailaddresses.com',
  'disposableinbox.com',
  'dispose.it',
  'dodgeit.com',
  'dodgit.com',
  'dontreg.com',
  'dontsendmespam.de',
  'drdrb.net',
  'dump-email.info',
  'dumpyemail.com',
  'e-mail.com',
  'e-mail.org',
  'easytrashmail.com',
  'emailias.com',
  'emailinfive.com',
  'emailsensei.com',
  'emailtemporario.com.br',
  'emailto.de',
  'emailwarden.com',
  'enterto.com',
  'ephemail.net',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'fastacura.com',
  'fastchevy.com',
  'fastchrysler.com',
  'fastkawasaki.com',
  'fastmazda.com',
  'fastmitsubishi.com',
  'fastnissan.com',
  'fastsubaru.com',
  'fastsuzuki.com',
  'fasttoyota.com',
  'fastyamaha.com',
  'filzmail.com',
  'fivemail.com',
  'fleckens.hu',
  'frapmail.com',
  'garliclife.com',
  'get-mail.cf',
  'getairmail.com',
  'getmails.eu',
  'givemail.com',
  'grandmamail.com',
  'great-host.in',
  'greensloth.com',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.info',
  'h.mintemail.com',
  'haltospam.com',
  'hasanmail.com',
  'hatespam.org',
  'hidemail.de',
  'hidzz.com',
  'hmamail.com',
  'hopemail.biz',
  'ieatspam.eu',
  'ieatspam.info',
  'ieh-mail.de',
  'inboxalias.com',
  'incognitomail.com',
  'incognitomail.net',
  'incognitomail.org',
  'insorg-mail.info',
  'instant-mail.de',
  'ip6.li',
  'irish2me.com',
  'jetable.com',
  'jetable.fr.nf',
  'jetable.net',
  'jetable.org',
  'jnxjn.com',
  'jourrapide.com',
  'jsrsolutions.com',
  'kasmail.com',
  'kaspop.com',
  'keepmymail.com',
  'killmail.com',
  'killmail.net',
  'koszmail.pl',
  'kurzepost.de',
  'lawlita.com',
  'letthemeatspam.com',
  'lhsdv.com',
  'lifebyfood.com',
  'link2mail.net',
  'litedrop.com',
  'lol.ovpn.to',
  'lookugly.com',
  'lopl.co.cc',
  'lortemail.dk',
  'lr78.com',
  'lroid.com',
  'lukop.dk',
  'm4ilweb.info',
  'maboard.com',
  'mail-filter.com',
  'mail-temporaire.fr',
  'mail.by',
  'mail.mezimages.net',
  'mail2rss.org',
  'mail333.com',
  'mail4trash.com',
  'mailbidon.com',
  'mailblocks.com',
  'mailcatch.com',
  'maildrop.cc',
  'maileater.com',
  'mailed.ro',
  'mailexpire.com',
  'mailforspam.com',
  'mailfreeonline.com',
  'mailguard.me',
  'mailimate.com',
  'mailin8r.com',
  'mailinater.com',
  'mailinator2.com',
  'mailinator.gq',
  'mailinator.us',
  'mailme.ir',
  'mailme.lv',
  'mailmetrash.com',
  'mailmoat.com',
  'mailnator.com',
  'mailnesia.com',
  'mailnull.com',
  'mailsac.com',
  'mailscrap.com',
  'mailshell.com',
  'mailsiphon.com',
  'mailtemp.info',
  'mailtome.de',
  'mailtothis.com',
  'mailzilla.com',
  'makemetheking.com',
  'manybrain.com',
  'mbx.cc',
  'mega.zik.dj',
  'meinspamschutz.de',
  'meltmail.com',
  'messagebeamer.de',
  'mierdamail.com',
  'mintemail.com',
  'mjukglass.nu',
  'mobi.web.id',
  'moburl.com',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'mt2009.com',
  'mt2014.com',
  'mycard.net.ua',
  'mycleaninbox.net',
  'myemailboxy.com',
  'mymail-in.net',
  'mymailoasis.com',
  'mypartyclip.de',
  'myphantomemail.com',
  'mysamp.de',
  'mytempemail.com',
  'mytempmail.com',
  'mytrashmail.com',
  'nabuma.com',
  'neomailbox.com',
  'nepwk.com',
  'nervmich.net',
  'nervtmich.net',
  'netmails.com',
  'netmails.net',
  'netzidiot.de',
  'neverbox.com',
  'no-spam.ws',
  'nobulk.com',
  'noclickemail.com',
  'nogmailspam.info',
  'nomail.xl.cx',
  'nomail2me.com',
  'nomorespamemails.com',
  'nonspam.eu',
  'nonspammer.de',
  'noref.in',
  'nospam.ze.tc',
  'nospam4.us',
  'nospamfor.us',
  'nospammail.net',
  'notmailinator.com',
  'nowmymail.com',
  'nullbox.info',
  'nurfuerspam.de',
  'nus.edu.sg',
  'nwldx.com',
  'objectmail.com',
  'obobbo.com',
  'odnorazovaya.com',
  'oneoffemail.com',
  'onewaymail.com',
  'onlatedotcom.info',
  'online.ms',
  'oopi.org',
  'opayq.com',
  'ordinaryamerican.net',
  'otherinbox.com',
  'ovpn.to',
  'owlpic.com',
  'pancakemail.com',
  'pcusers.otherinbox.com',
  'pjkmi.com',
  'plexolan.de',
  'pooae.com',
  'pookmail.com',
  'privacy.net',
  'proxymail.eu',
  'prtnx.com',
  'punkass.com',
  'putthisinyourspamdatabase.com',
  'qq.com',
  'quickinbox.com',
  'rcpt.at',
  'reallymymail.com',
  'realtyalerts.ca',
  'recode.me',
  'recursor.net',
  'recyclebin.jp',
  'regbypass.com',
  'regbypass.comsafe-mail.net',
  'rejectmail.com',
  'reliable-mail.com',
  'rhyta.com',
  'rklips.com',
  'rmqkr.net',
  'royal.net',
  'rppkn.com',
  'rtrtr.com',
  'rudymail.com',
  's0ny.net',
  'safe-mail.net',
  'safersignup.de',
  'safetymail.info',
  'safetypost.de',
  'sandelf.de',
  'saynotospams.com',
  'schafmail.de',
  'schrott-email.de',
  'secretemail.de',
  'secure-mail.biz',
  'senseless-entertainment.com',
  'services391.com',
  'sharklasers.com',
  'shieldemail.com',
  'shiftmail.com',
  'shitmail.me',
  'shitware.nl',
  'shmeriously.com',
  'shortmail.net',
  'sibmail.com',
  'sinnlos-mail.de',
  'skeefmail.com',
  'slapsfromlastnight.com',
  'slaskpost.se',
  'slopsbox.com',
  'smellfear.com',
  'snakemail.com',
  'sneakemail.com',
  'snkmail.com',
  'sofimail.com',
  'sofort-mail.de',
  'sogetthis.com',
  'soodonims.com',
  'spam.la',
  'spam.su',
  'spam4.me',
  'spamail.de',
  'spambob.com',
  'spambob.net',
  'spambob.org',
  'spambog.com',
  'spambog.de',
  'spambog.ru',
  'spambox.info',
  'spambox.irishspringrealty.com',
  'spambox.us',
  'spamcannon.com',
  'spamcannon.net',
  'spamcero.com',
  'spamcorptastic.com',
  'spamcowboy.com',
  'spamcowboy.net',
  'spamcowboy.org',
  'spamday.com',
  'spameater.com',
  'spameater.org',
  'spamex.com',
  'spamfree24.com',
  'spamfree24.de',
  'spamfree24.eu',
  'spamfree24.net',
  'spamfree24.org',
  'spamgoes.com',
  'spamgourmet.com',
  'spamgourmet.net',
  'spamgourmet.org',
  'spamhole.com',
  'spamify.com',
  'spaminator.de',
  'spamkill.info',
  'spaml.de',
  'spaml.com',
  'spammotel.com',
  'spamobox.com',
  'spamoff.de',
  'spamsalad.in',
  'spamspot.com',
  'spamstack.net',
  'spamthis.co.uk',
  'spamthisplease.com',
  'spamtrail.com',
  'spamtroll.net',
  'speed.1s.fr',
  'spoofmail.de',
  'stuffmail.de',
  'super-auswahl.de',
  'supergreatmail.com',
  'supermailer.jp',
  'superrito.com',
  'superstachel.de',
  'suremail.info',
  'talkinator.com',
  'teewars.org',
  'teleworm.com',
  'teleworm.us',
  'temp-mail.de',
  'temp-mail.ru',
  'tempe-mail.com',
  'tempemail.biz',
  'tempemail.com',
  'tempinbox.co.uk',
  'tempinbox.com',
  'tempmail.eu',
  'tempmail2.com',
  'tempmaildemo.com',
  'tempmailer.com',
  'tempmailer.de',
  'tempomail.fr',
  'temporarily.de',
  'temporarioemail.com.br',
  'temporaryemail.net',
  'temporaryemail.us',
  'temporaryforwarding.com',
  'temporaryinbox.com',
  'temporarymailaddress.com',
  'tempsky.com',
  'thanksnospam.info',
  'thankyou2010.com',
  'thecloudindex.com',
  'thisisnotmyrealemail.com',
  'throam.com',
  'throwawayemailaddresses.com',
  'tilien.com',
  'tittbit.in',
  'tizi.com',
  'tmail.ws',
  'tmailinator.com',
  'toiea.com',
  'toomail.biz',
  'topranklist.de',
  'tradermail.info',
  'trash-amil.com',
  'trash-mail.at',
  'trash-mail.com',
  'trash-mail.de',
  'trash2009.com',
  'trashdevil.com',
  'trashemail.de',
  'trashmail.at',
  'trashmail.com',
  'trashmail.de',
  'trashmail.me',
  'trashmail.net',
  'trashmail.org',
  'trashmail.ws',
  'trashmailer.com',
  'trashymail.com',
  'trashymail.net',
  'tyldd.com',
  'uggsrock.com',
  'umail.net',
  'upliftnow.com',
  'uplipht.com',
  'uroid.com',
  'us.af',
  'venompen.com',
  'veryrealemail.com',
  'vidchart.com',
  'viditag.com',
  'viewcastmedia.com',
  'viewcastmedia.net',
  'viewcastmedia.org',
  'vomoto.com',
  'vubby.com',
  'walala.org',
  'walkmail.net',
  'webemail.me',
  'webm4il.info',
  'weg-werfen.de',
  'wegwerf-email-addressen.de',
  'wegwerf-emails.de',
  'wegwerfadresse.de',
  'wegwerfemail.de',
  'wegwerfmail.de',
  'wegwerfmail.info',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'wetrainbayarea.com',
  'wetrainbayarea.org',
  'wh4f.org',
  'whatiaas.com',
  'whatpaas.com',
  'whatsaas.com',
  'whopy.com',
  'willhackforfood.biz',
  'willselfdestruct.com',
  'winemaven.info',
  'wronghead.com',
  'wuzup.net',
  'wuzupmail.net',
  'www.e4ward.com',
  'www.gishpuppy.com',
  'www.mailinator.com',
  'wwwnew.eu',
  'x.ip6.li',
  'xagloo.com',
  'xemaps.com',
  'xents.com',
  'xmaily.com',
  'xoxy.net',
  'yapped.net',
  'yeah.net',
  'yep.it',
  'yogamaven.com',
  'yomail.info',
  'yuurok.com',
  'zehnminutenmail.de',
  'zetmail.com',
  'zoemail.org',
  'zoemail.net',
  'zomg.info'
]);

// Additional patterns to check for suspicious domains
const SUSPICIOUS_PATTERNS = [
  /^[0-9]+mail/,           // Numbers followed by "mail"
  /temp.*mail/,            // "temp" + "mail"
  /disposable/,            // Contains "disposable"
  /throwaway/,             // Contains "throwaway"
  /fake.*mail/,            // "fake" + "mail"
  /spam.*mail/,            // "spam" + "mail"
  /trash.*mail/,           // "trash" + "mail"
  /^[a-z]{1,3}\.[a-z]{1,3}$/,  // Very short domains like "a.b"
];

export interface EmailValidationResult {
  isValid: boolean;
  isDisposable: boolean;
  isSuspicious: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  domain: string;
  localPart: string;
}

export class EmailValidationService {
  
  /**
   * Comprehensive email validation
   */
  static validateEmail(email: string): EmailValidationResult {
    const result: EmailValidationResult = {
      isValid: false,
      isDisposable: false,
      isSuspicious: false,
      errors: [],
      warnings: [],
      suggestions: [],
      domain: '',
      localPart: ''
    };

    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      result.errors.push('Please enter a valid email address (example: name@domain.com)');
      return result;
    }

    const [localPart, domain] = email.toLowerCase().split('@');
    result.localPart = localPart;
    result.domain = domain;

    // Check for disposable domains
    if (DISPOSABLE_DOMAINS.has(domain)) {
      result.isDisposable = true;
      result.errors.push('Temporary email addresses are not allowed. Please use your regular email address.');
    }

    // Check for suspicious patterns
    const isSuspiciousPattern = SUSPICIOUS_PATTERNS.some(pattern => pattern.test(domain));
    if (isSuspiciousPattern) {
      result.isSuspicious = true;
      result.errors.push('This email domain appears to be temporary. Please use a permanent email address.');
    }

    // Additional validations
    if (localPart.length > 64) {
      result.errors.push('The email address is too long before the @ symbol.');
    }

    if (domain.length > 253) {
      result.errors.push('The email domain is too long.');
    }

    // Check for common typos in popular domains
    const popularDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com'];
    const potentialTypos = this.checkForTypos(domain, popularDomains);
    if (potentialTypos.length > 0) {
      result.suggestions.push(`Did you mean: ${potentialTypos.join(' or ')}?`);
    }

    // Check for suspicious patterns that might be typos
    if (domain.includes('..')) {
      result.errors.push('Email contains invalid characters (..)');
    }

    if (domain.startsWith('.') || domain.endsWith('.')) {
      result.errors.push('Email domain cannot start or end with a period');
    }

    // Final validation
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Check for common typos in email domains
   */
  private static checkForTypos(domain: string, popularDomains: string[]): string[] {
    const suggestions: string[] = [];
    
    for (const popularDomain of popularDomains) {
      const distance = this.levenshteinDistance(domain, popularDomain);
      // If only 1-2 character difference, suggest it
      if (distance <= 2 && distance > 0) {
        suggestions.push(popularDomain);
      }
    }
    
    return suggestions;
  }

  /**
   * Calculate Levenshtein distance for typo detection
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Quick check if email is from a disposable domain
   */
  static isDisposableEmail(email: string): boolean {
    const domain = email.toLowerCase().split('@')[1];
    return DISPOSABLE_DOMAINS.has(domain) || 
           SUSPICIOUS_PATTERNS.some(pattern => pattern.test(domain));
  }

  /**
   * Add custom domain to blacklist (for runtime additions)
   */
  static addToBlacklist(domain: string): void {
    DISPOSABLE_DOMAINS.add(domain.toLowerCase());
  }

  /**
   * Check multiple emails at once
   */
  static validateMultipleEmails(emails: string[]): EmailValidationResult[] {
    return emails.map(email => this.validateEmail(email));
  }

  /**
   * Get user-friendly error message for display
   */
  static getDisplayMessage(result: EmailValidationResult): string {
    if (result.isValid) {
      return 'Email address looks good!';
    }

    if (result.errors.length > 0) {
      let message = result.errors[0];
      if (result.suggestions.length > 0) {
        message += ` ${result.suggestions[0]}`;
      }
      return message;
    }

    return 'Please check your email address and try again.';
  }

  /**
   * Check if domain appears to be a legitimate business email
   */
  static isBusinessEmail(email: string): boolean {
    const domain = email.toLowerCase().split('@')[1];
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    return !personalDomains.includes(domain) && !this.isDisposableEmail(email);
  }
}

export default EmailValidationService; 