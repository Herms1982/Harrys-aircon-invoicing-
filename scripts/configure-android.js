import fs from 'fs';
import path from 'path';

console.log('--- Configuring Android Permissions, SDK Versions & Gradle Signing ---');

const baseDir = process.cwd();

// 1. Fix Top-Level android/build.gradle AGP Version (8.13.0 -> 8.7.3)
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

// 2. Fix android/variables.gradle SDK Versions (Change compileSdk/targetSdk 36 -> 35)
const varsGradlePath = path.join(baseDir, 'android', 'variables.gradle');
if (fs.existsSync(varsGradlePath)) {
  let varsGradle = fs.readFileSync(varsGradlePath, 'utf8');
  varsGradle = varsGradle.replace(/compileSdkVersion = 36/g, 'compileSdkVersion = 35');
  varsGradle = varsGradle.replace(/targetSdkVersion = 36/g, 'targetSdkVersion = 35');
  fs.writeFileSync(varsGradlePath, varsGradle, 'utf8');
  console.log('✓ Updated android/variables.gradle compileSdk/targetSdk to 35');
} else {
  console.warn('⚠️ android/variables.gradle not found');
}

// 3. Ensure Gradle Wrapper Distribution URL is compatible (gradle-8.11.1-all.zip)
const wrapperPath = path.join(baseDir, 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
if (fs.existsSync(wrapperPath)) {
  let wrapper = fs.readFileSync(wrapperPath, 'utf8');
  if (wrapper.includes('gradle-8.14') || !wrapper.includes('gradle-8.11.1')) {
    wrapper = wrapper.replace(/distributionUrl=.*$/m, 'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.11.1-all.zip');
    fs.writeFileSync(wrapperPath, wrapper, 'utf8');
    console.log('✓ Updated gradle-wrapper.properties to Gradle 8.11.1');
  }
}

// 3. AndroidManifest.xml Permissions
const manifestPath = path.join(baseDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  const permissions = `
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.ACCESS_MEDIA_LOCATION" />`;

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

// 4. android/app/build.gradle Signing Configuration
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

console.log('--- Android configuration complete ---');


