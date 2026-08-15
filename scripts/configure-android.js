import fs from 'fs';
import path from 'path';
import https from 'https';
import { generateAllAndroidAssets } from './generate-android-assets.js';

console.log('--- Configuring Android Permissions, SDK Versions & Gradle Signing ---');

const baseDir = process.cwd();

// 1. Check and repair android/gradle/wrapper/gradle-wrapper.jar
const wrapperJarPath = path.join(baseDir, 'android', 'gradle', 'wrapper', 'gradle-wrapper.jar');
async function ensureValidWrapperJar() {
  const dir = path.dirname(wrapperJarPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Download official Capacitor gradle-wrapper.jar which includes Main-Class in MANIFEST.MF
  console.log('Downloading official gradle-wrapper.jar binary...');
  const jarUrl = 'https://raw.githubusercontent.com/ionic-team/capacitor/main/android/gradle/wrapper/gradle-wrapper.jar';
  
  try {
    const res = await fetch(jarUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(wrapperJarPath, Buffer.from(arrayBuffer));
    console.log('✓ Successfully downloaded fresh gradle-wrapper.jar');
  } catch (err) {
    console.error('❌ Failed to download gradle-wrapper.jar:', err.message);
  }
}

async function run() {
  await ensureValidWrapperJar();

  // 2. Fix Top-Level android/build.gradle AGP Version (8.13.0 -> 8.7.3)
  const topGradlePath = path.join(baseDir, 'android', 'build.gradle');
  if (fs.existsSync(topGradlePath)) {
    let topGradle = fs.readFileSync(topGradlePath, 'utf8');
    if (topGradle.includes('8.13.0') || topGradle.includes('com.android.tools.build:gradle:')) {
      topGradle = topGradle.replace(/com\.android\.tools\.build:gradle:[^\s"']+/g, 'com.android.tools.build:gradle:8.7.3');
      fs.writeFileSync(topGradlePath, topGradle, 'utf8');
      console.log('✓ Fixed top-level android/build.gradle AGP version to 8.7.3');
    }
  } else {
    console.warn('⚠️ Top-level android/build.gradle not found');
  }

  // 3. Fix android/variables.gradle SDK & AndroidX Dependency Versions
  const varsGradlePath = path.join(baseDir, 'android', 'variables.gradle');
  if (fs.existsSync(varsGradlePath)) {
    const validVarsGradle = `ext {
    minSdkVersion = 24
    compileSdkVersion = 35
    targetSdkVersion = 35
    androidxActivityVersion = '1.9.3'
    androidxAppCompatVersion = '1.7.0'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.15.0'
    androidxFragmentVersion = '1.8.5'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.12.1'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.2.1'
    androidxEspressoCoreVersion = '3.6.1'
    cordovaAndroidVersion = '10.1.1'
}
`;
    fs.writeFileSync(varsGradlePath, validVarsGradle, 'utf8');
    console.log('✓ Configured android/variables.gradle with compileSdk 35 and valid AndroidX dependencies');
  } else {
    console.warn('⚠️ android/variables.gradle not found');
  }

  // 4. Ensure Gradle Wrapper Distribution URL is compatible (gradle-8.11.1-all.zip)
  const wrapperPath = path.join(baseDir, 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
  if (fs.existsSync(wrapperPath)) {
    let wrapper = fs.readFileSync(wrapperPath, 'utf8');
    if (wrapper.includes('gradle-8.14') || !wrapper.includes('gradle-8.11.1')) {
      wrapper = wrapper.replace(/distributionUrl=.*$/m, 'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.11.1-all.zip');
      fs.writeFileSync(wrapperPath, wrapper, 'utf8');
      console.log('✓ Updated gradle-wrapper.properties to Gradle 8.11.1');
    }
  }

  // 5. AndroidManifest.xml Permissions
  const manifestPath = path.join(baseDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    const permissions = `
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.ACCESS_MEDIA_LOCATION" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />`;

    if (!manifest.includes('android.permission.INTERNET')) {
      manifest = manifest.replace('</manifest>', `${permissions}\n</manifest>`);
      fs.writeFileSync(manifestPath, manifest, 'utf8');
      console.log('✓ Updated AndroidManifest.xml with required permissions');
    } else {
      console.log('✓ AndroidManifest.xml permissions already configured');
    }
  } else {
    console.warn('⚠️ AndroidManifest.xml not found');
  }

  // 6. android/app/build.gradle Signing Configuration
  const appGradlePath = path.join(baseDir, 'android', 'app', 'build.gradle');
  if (fs.existsSync(appGradlePath)) {
    let appGradle = fs.readFileSync(appGradlePath, 'utf8');

    // Add signingConfigs inside android { ... } if missing
    if (!appGradle.includes('signingConfigs {')) {
      const signingBlock = `
    signingConfigs {
        release {
            storeFile file("harrys-release.keystore")
            storePassword "HarrysAircon2026Pass"
            keyAlias "harrys-key"
            keyPassword "HarrysAircon2026Pass"
        }
    }\n`;

      appGradle = appGradle.replace(/android\s*\{/, `android {${signingBlock}`);
    }

    // Attach release signingConfig inside buildTypes { release { ... } }
    if (!appGradle.includes('signingConfig signingConfigs.release')) {
      appGradle = appGradle.replace(/release\s*\{/, `release {\n            signingConfig signingConfigs.release`);
    }

    fs.writeFileSync(appGradlePath, appGradle, 'utf8');
    console.log('✓ Updated android/app/build.gradle with Release signing config');
  } else {
    console.warn('⚠️ android/app/build.gradle not found');
  }

  // 7. Repair & Generate Valid Mipmap and Splash Icon Assets (fixes AAPT compilation errors)
  generateAllAndroidAssets(baseDir);

  console.log('--- Android configuration complete ---');
}

run();



