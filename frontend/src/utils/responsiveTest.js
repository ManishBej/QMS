// Mobile Responsive Testing Script for QMS
// This script tests various responsive features and breakpoints

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  large: 1280
};

export const DEVICE_CONFIGS = {
  'iPhone SE': { width: 375, height: 667, dpr: 2 },
  'iPhone 12': { width: 390, height: 844, dpr: 3 },
  'iPhone 12 Pro Max': { width: 428, height: 926, dpr: 3 },
  'Samsung Galaxy S21': { width: 360, height: 800, dpr: 3 },
  'iPad': { width: 768, height: 1024, dpr: 2 },
  'iPad Pro': { width: 1024, height: 1366, dpr: 2 },
  'Desktop': { width: 1920, height: 1080, dpr: 1 }
};

// Test responsive features
export class ResponsiveTestSuite {
  constructor() {
    this.testResults = [];
    this.currentBreakpoint = this.getCurrentBreakpoint();
  }

  getCurrentBreakpoint() {
    const width = window.innerWidth;
    if (width <= BREAKPOINTS.mobile) return 'mobile';
    if (width <= BREAKPOINTS.tablet) return 'tablet';  
    if (width <= BREAKPOINTS.desktop) return 'desktop';
    return 'large';
  }

  // Test mobile navigation
  testMobileNavigation() {
    const mobileNav = document.querySelector('.mobile-nav-header');
    const desktopNav = document.querySelector('.app-nav');
    
    const result = {
      test: 'Mobile Navigation',
      passed: false,
      details: {}
    };

    if (this.currentBreakpoint === 'mobile' || this.currentBreakpoint === 'tablet') {
      result.passed = mobileNav && window.getComputedStyle(mobileNav).display !== 'none' &&
                     desktopNav && window.getComputedStyle(desktopNav).display === 'none';
      result.details = {
        mobileNavVisible: mobileNav ? window.getComputedStyle(mobileNav).display !== 'none' : false,
        desktopNavHidden: desktopNav ? window.getComputedStyle(desktopNav).display === 'none' : false
      };
    } else {
      result.passed = (!mobileNav || window.getComputedStyle(mobileNav).display === 'none') &&
                     desktopNav && window.getComputedStyle(desktopNav).display !== 'none';
      result.details = {
        mobileNavHidden: !mobileNav || window.getComputedStyle(mobileNav).display === 'none',
        desktopNavVisible: desktopNav ? window.getComputedStyle(desktopNav).display !== 'none' : false
      };
    }

    this.testResults.push(result);
    return result;
  }

  // Test table responsiveness
  testResponsiveTables() {
    const tables = document.querySelectorAll('.responsive-table-container');
    let passed = true;
    const details = {};

    tables.forEach((table, index) => {
      const desktopView = table.querySelector('.desktop-table-view');
      const mobileView = table.querySelector('.mobile-card-view');
      
      if (this.currentBreakpoint === 'mobile' || this.currentBreakpoint === 'tablet') {
        const mobileVisible = mobileView && window.getComputedStyle(mobileView).display !== 'none';
        const desktopHidden = desktopView && window.getComputedStyle(desktopView).display === 'none';
        
        if (!mobileVisible || !desktopHidden) passed = false;
        details[`table_${index}`] = { mobileVisible, desktopHidden };
      } else {
        const desktopVisible = desktopView && window.getComputedStyle(desktopView).display !== 'none';
        const mobileHidden = mobileView && window.getComputedStyle(mobileView).display === 'none';
        
        if (!desktopVisible || !mobileHidden) passed = false;
        details[`table_${index}`] = { desktopVisible, mobileHidden };
      }
    });

    const result = {
      test: 'Responsive Tables',
      passed,
      details
    };

    this.testResults.push(result);
    return result;
  }

  // Test touch targets
  testTouchTargets() {
    const clickableElements = document.querySelectorAll('button, .nav-item, .mobile-nav-item, .tab-btn');
    let passed = true;
    const issues = [];

    clickableElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const minTouchTarget = 44; // 44px minimum recommended touch target
      
      if (rect.width < minTouchTarget || rect.height < minTouchTarget) {
        passed = false;
        issues.push({
          element: element.tagName + (element.className ? `.${element.className.split(' ')[0]}` : ''),
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          index
        });
      }
    });

    const result = {
      test: 'Touch Target Sizes',
      passed,
      details: {
        totalElements: clickableElements.length,
        issues: issues.slice(0, 10) // Limit to first 10 issues
      }
    };

    this.testResults.push(result);
    return result;
  }

  // Test viewport meta tag
  testViewportMeta() {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const content = viewportMeta ? viewportMeta.getAttribute('content') : '';
    
    const hasWidthDevice = content.includes('width=device-width');
    const hasInitialScale = content.includes('initial-scale=1');
    const hasViewportFit = content.includes('viewport-fit=cover');
    
    const result = {
      test: 'Viewport Meta Tag',
      passed: hasWidthDevice && hasInitialScale,
      details: {
        content,
        hasWidthDevice,
        hasInitialScale,
        hasViewportFit
      }
    };

    this.testResults.push(result);
    return result;
  }

  // Test form responsiveness
  testResponsiveForms() {
    const forms = document.querySelectorAll('.responsive-form, form');
    let passed = true;
    const details = {};

    forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input, select, textarea');
      let formIssues = [];

      inputs.forEach(input => {
        const rect = input.getBoundingClientRect();
        if (rect.width > window.innerWidth - 32) { // Accounting for padding
          formIssues.push('Input wider than viewport');
        }
      });

      if (formIssues.length > 0) {
        passed = false;
        details[`form_${index}`] = formIssues;
      }
    });

    const result = {
      test: 'Responsive Forms',
      passed,
      details
    };

    this.testResults.push(result);
    return result;
  }

  // Run all tests
  runAllTests() {
    console.log(`🧪 Running responsive tests at ${this.currentBreakpoint} breakpoint...`);
    
    this.testMobileNavigation();
    this.testResponsiveTables();
    this.testTouchTargets();
    this.testViewportMeta();
    this.testResponsiveForms();

    return this.generateReport();
  }

  // Generate test report
  generateReport() {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const score = Math.round((passed / total) * 100);

    const report = {
      breakpoint: this.currentBreakpoint,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      score,
      summary: `${passed}/${total} tests passed`,
      results: this.testResults,
      recommendations: this.generateRecommendations()
    };

    console.log('📱 Responsive Test Report:', report);
    return report;
  }

  // Generate recommendations based on test results
  generateRecommendations() {
    const recommendations = [];
    
    this.testResults.forEach(result => {
      if (!result.passed) {
        switch (result.test) {
          case 'Mobile Navigation':
            recommendations.push('Fix mobile navigation visibility for current breakpoint');
            break;
          case 'Responsive Tables':
            recommendations.push('Ensure tables switch between desktop and mobile views correctly');
            break;
          case 'Touch Target Sizes':
            recommendations.push('Increase touch target sizes to minimum 44px for better accessibility');
            break;
          case 'Viewport Meta Tag':
            recommendations.push('Add or fix viewport meta tag for proper mobile rendering');
            break;
          case 'Responsive Forms':
            recommendations.push('Fix form elements that exceed viewport width');
            break;
        }
      }
    });

    return recommendations;
  }
}

// Utility functions for manual testing
export const ResponsiveTestUtils = {
  // Simulate different screen sizes
  setViewport(width, height) {
    if (window.chrome && window.chrome.runtime) {
      console.warn('Cannot programmatically change viewport in browser. Use DevTools instead.');
      return;
    }
    
    document.documentElement.style.width = width + 'px';
    document.documentElement.style.height = height + 'px';
    window.dispatchEvent(new Event('resize'));
  },

  // Test specific device
  testDevice(deviceName) {
    const config = DEVICE_CONFIGS[deviceName];
    if (!config) {
      console.error('Unknown device:', deviceName);
      return;
    }

    console.log(`🔍 Testing ${deviceName} (${config.width}x${config.height})`);
    this.setViewport(config.width, config.height);
    
    setTimeout(() => {
      const tester = new ResponsiveTestSuite();
      return tester.runAllTests();
    }, 100);
  },

  // Get current responsive state
  getCurrentState() {
    const tester = new ResponsiveTestSuite();
    return {
      breakpoint: tester.currentBreakpoint,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
    };
  },

  // Log responsive CSS variables
  logCSSVariables() {
    const root = getComputedStyle(document.documentElement);
    const cssVars = [
      '--bg', '--panel', '--panel-2', '--text', '--muted', 
      '--brand', '--brand-2', '--border', '--chip'
    ];
    
    const values = {};
    cssVars.forEach(varName => {
      values[varName] = root.getPropertyValue(varName).trim();
    });
    
    console.table(values);
    return values;
  }
};

// Auto-run tests when window resizes
window.addEventListener('resize', () => {
  const tester = new ResponsiveTestSuite();
  console.log(`📐 Viewport changed to ${window.innerWidth}x${window.innerHeight} (${tester.currentBreakpoint})`);
});

// Expose to global scope for manual testing
window.ResponsiveTest = ResponsiveTestSuite;
window.ResponsiveUtils = ResponsiveTestUtils;

console.log('📱 Responsive testing tools loaded. Use:');
console.log('- new ResponsiveTest().runAllTests() - Run all responsive tests');
console.log('- ResponsiveUtils.testDevice("iPhone 12") - Test specific device');
console.log('- ResponsiveUtils.getCurrentState() - Get current responsive state');
