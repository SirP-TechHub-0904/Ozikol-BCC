/**
 * Structured client browser and device telemetry representation.
 */
export interface ClientDeviceTelemetry {
  browserName: string;
  browserVersion: string;
  osName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  displayTitle: string; // e.g. "Google Chrome on Windows 10/11"
  displayDetails: string; // e.g. "Google Chrome 155 • Desktop"
  icon: string; // Material Symbols icon: "desktop_windows", "laptop_mac", "smartphone", "tablet", "terminal"
}

/**
 * High-fidelity parser for extracting clean browser, OS, and device categories from HTTP User-Agent strings.
 * @param userAgent Raw User-Agent string.
 * @returns Structured client telemetry.
 */
export function parseUserAgent(userAgent: string | undefined | null): ClientDeviceTelemetry {
  if (!userAgent || !userAgent.trim()) {
    return {
      browserName: 'Web Browser',
      browserVersion: '',
      osName: 'Unknown OS',
      deviceType: 'desktop',
      displayTitle: 'Web Browser Session',
      displayDetails: 'Desktop Browser',
      icon: 'computer'
    };
  }

  const ua = userAgent.trim();

  // If already a pre-formatted friendly title (e.g. "Google Chrome on Windows 10/11")
  if (!ua.toLowerCase().startsWith('mozilla/') && ua.includes(' on ')) {
    const parts = ua.split(' on ');
    const isMobile = /mobile|phone|android|iphone/i.test(ua);
    const isTablet = /tablet|ipad/i.test(ua);
    return {
      browserName: parts[0] || 'Web Browser',
      browserVersion: '',
      osName: parts[1] || 'Device',
      deviceType: isMobile ? 'mobile' : (isTablet ? 'tablet' : 'desktop'),
      displayTitle: ua,
      displayDetails: `${parts[0] || 'Browser'} • ${isMobile ? 'Mobile' : (isTablet ? 'Tablet' : 'Desktop')}`,
      icon: isMobile ? 'smartphone' : (isTablet ? 'tablet' : 'desktop_windows')
    };
  }

  // 1. Operating System & Form Factor Detection
  let osName = 'Unknown OS';
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  let icon = 'computer';

  if (/Windows NT 10\.0/i.test(ua)) {
    osName = 'Windows 10/11';
    icon = 'desktop_windows';
  } else if (/Windows NT 6\.3/i.test(ua)) {
    osName = 'Windows 8.1';
    icon = 'desktop_windows';
  } else if (/Windows NT 6\.2/i.test(ua)) {
    osName = 'Windows 8';
    icon = 'desktop_windows';
  } else if (/Windows NT 6\.1/i.test(ua)) {
    osName = 'Windows 7';
    icon = 'desktop_windows';
  } else if (/Windows/i.test(ua)) {
    osName = 'Windows';
    icon = 'desktop_windows';
  } else if (/iPhone/i.test(ua)) {
    osName = 'iOS (iPhone)';
    deviceType = 'mobile';
    icon = 'smartphone';
  } else if (/iPad/i.test(ua)) {
    osName = 'iPadOS';
    deviceType = 'tablet';
    icon = 'tablet';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    osName = 'macOS';
    icon = 'laptop_mac';
  } else if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) {
      osName = 'Android';
      deviceType = 'mobile';
      icon = 'smartphone';
    } else {
      osName = 'Android Tablet';
      deviceType = 'tablet';
      icon = 'tablet';
    }
  } else if (/Ubuntu/i.test(ua)) {
    osName = 'Ubuntu Linux';
    icon = 'terminal';
  } else if (/Linux/i.test(ua)) {
    osName = 'Linux';
    icon = 'terminal';
  } else if (/CrOS/i.test(ua)) {
    osName = 'ChromeOS';
    icon = 'laptop';
  }

  // 2. Browser & Major Version Detection
  let browserName = 'Web Browser';
  let browserVersion = '';

  let match: RegExpMatchArray | null;

  if ((match = ua.match(/Edg(?:e|A|iOS)?\/([0-9]+)/i))) {
    browserName = 'Microsoft Edge';
    browserVersion = match[1];
  } else if ((match = ua.match(/(?:OPR|Opera)\/([0-9]+)/i))) {
    browserName = 'Opera';
    browserVersion = match[1];
  } else if ((match = ua.match(/Vivaldi\/([0-9]+)/i))) {
    browserName = 'Vivaldi';
    browserVersion = match[1];
  } else if ((match = ua.match(/SamsungBrowser\/([0-9]+)/i))) {
    browserName = 'Samsung Internet';
    browserVersion = match[1];
  } else if ((match = ua.match(/Chrome\/([0-9]+)/i))) {
    browserName = 'Google Chrome';
    browserVersion = match[1];
  } else if ((match = ua.match(/(?:Firefox|FxiOS)\/([0-9]+)/i))) {
    browserName = 'Mozilla Firefox';
    browserVersion = match[1];
  } else if ((match = ua.match(/Version\/([0-9]+).*Safari/i))) {
    browserName = 'Apple Safari';
    browserVersion = match[1];
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browserName = 'Apple Safari';
  }

  const verSnippet = browserVersion ? ` ${browserVersion}` : '';
  const displayTitle = `${browserName} on ${osName}`;
  const deviceTypeLabel = deviceType === 'mobile' ? 'Mobile' : (deviceType === 'tablet' ? 'Tablet' : 'Desktop');
  const displayDetails = `${browserName}${verSnippet} • ${deviceTypeLabel}`;

  return {
    browserName,
    browserVersion,
    osName,
    deviceType,
    displayTitle,
    displayDetails,
    icon
  };
}

/**
 * Formats an IP address, presenting loopback addresses cleanly.
 * @param ip Raw IP address.
 * @returns Formatted IP address string.
 */
export function formatClientIpAddress(ip: string | undefined | null): string {
  if (!ip) return '127.0.0.1 (Localhost)';
  const trimmed = ip.trim();
  if (trimmed === '::1' || trimmed === '127.0.0.1' || trimmed === 'localhost') {
    return '127.0.0.1 (Localhost)';
  }
  return trimmed;
}
