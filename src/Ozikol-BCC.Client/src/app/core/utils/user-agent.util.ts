/**
 * Structured client browser and device telemetry representation.
 */
export interface ClientDeviceTelemetry {
  browserName: string;
  browserVersion: string;
  osName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  clientType: 'web' | 'desktop' | 'mobile';
  displayTitle: string; // e.g. "Google Chrome on Windows 10/11", "Desktop App on Windows"
  displayDetails: string; // e.g. "Google Chrome 130 • Desktop Browser", "Desktop App • Desktop"
  icon: string; // Material Symbols icon: "language", "desktop_windows", "laptop_mac", "smartphone", "tablet", "terminal"
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
      clientType: 'web',
      displayTitle: 'Web Browser Session',
      displayDetails: 'Desktop Browser',
      icon: 'language'
    };
  }

  const ua = userAgent.trim();

  // 1. Check for native Ozikol BCC desktop and mobile applications
  if (/BCC-Client|OzikolBCC-Flutter|Flutter/i.test(ua)) {
    const isMobile = /Mobile|Android|iOS/i.test(ua);
    const isApple = /iOS|macOS/i.test(ua);
    const os = /Android/i.test(ua) ? 'Android' :
               /iOS/i.test(ua) ? 'iOS' :
               /Windows/i.test(ua) ? 'Windows' :
               /macOS/i.test(ua) ? 'macOS' :
               /Linux/i.test(ua) ? 'Linux' : 'Device';
    const browserName = isMobile ? 'Mobile App' : 'Desktop App';
    const deviceType: 'desktop' | 'mobile' = isMobile ? 'mobile' : 'desktop';
    const clientType: 'desktop' | 'mobile' = isMobile ? 'mobile' : 'desktop';
    const icon = isMobile ? 'smartphone' : (isApple ? 'laptop_mac' : (os === 'Linux' ? 'terminal' : 'desktop_windows'));

    return {
      browserName,
      browserVersion: '1.0',
      osName: os,
      deviceType,
      clientType,
      displayTitle: `${browserName} on ${os}`,
      displayDetails: `${browserName} • ${deviceType === 'mobile' ? 'Mobile' : 'Desktop'}`,
      icon
    };
  }

  // 2. If already a pre-formatted friendly title (e.g. "Google Chrome on Windows 10/11", "Desktop App on Windows")
  if (!ua.toLowerCase().startsWith('mozilla/') && ua.includes(' on ')) {
    const parts = ua.split(' on ');
    const firstPart = parts[0] || 'Web Browser';
    const secondPart = parts[1] || 'Device';
    const isDesktopApp = /Desktop App/i.test(firstPart);
    const isMobileApp = /Mobile App/i.test(firstPart);
    const isMobile = isMobileApp || /mobile|phone|android|iphone/i.test(ua);
    const isTablet = /tablet|ipad/i.test(ua);
    const deviceType: 'desktop' | 'mobile' | 'tablet' = isMobile ? 'mobile' : (isTablet ? 'tablet' : 'desktop');
    const clientType: 'web' | 'desktop' | 'mobile' = isDesktopApp ? 'desktop' : (isMobileApp ? 'mobile' : 'web');
    const icon = isDesktopApp ? (secondPart.includes('macOS') ? 'laptop_mac' : (secondPart.includes('Linux') ? 'terminal' : 'desktop_windows')) :
                 (isMobile ? 'smartphone' : (isTablet ? 'tablet' : 'language'));

    return {
      browserName: firstPart,
      browserVersion: '',
      osName: secondPart,
      deviceType,
      clientType,
      displayTitle: ua,
      displayDetails: `${firstPart} • ${isMobile ? 'Mobile' : (isTablet ? 'Tablet' : (isDesktopApp ? 'Desktop' : 'Desktop Browser'))}`,
      icon
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
  const displayDetails = `${browserName}${verSnippet} • ${deviceTypeLabel} Browser`;
  const resolvedIcon = deviceType === 'mobile' ? 'smartphone' : (deviceType === 'tablet' ? 'tablet' : 'language');

  return {
    browserName,
    browserVersion,
    osName,
    deviceType,
    clientType: 'web',
    displayTitle,
    displayDetails,
    icon: resolvedIcon
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
