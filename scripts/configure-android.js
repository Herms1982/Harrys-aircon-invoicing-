import fs from 'fs';
import path from 'path';

console.log('--- Configuring Android Permissions & Gradle Signing ---');

// 1. AndroidManifest.xml Permissions
const manifestPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
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
  console.warn('⚠️ AndroidManifest.xml not found at:', manifestPath);
}

// 2. build.gradle Signing Configuration
const gradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');

  // Add signingConfigs inside android { ... } if missing
  if (!gradle.includes('signingConfigs {')) {
    const signingBlock = `
    signingConfigs {
        release {
            storeFile file("harrys-release.keystore")
            storePassword "HarrysAircon2026Pass"
            keyAlias "harrys-key"
            keyPassword "HarrysAircon2026Pass"
        }
    }\n`;

    gradle = gradle.replace(/android\s*\{/, `android {${signingBlock}`);
  }

  // Attach release signingConfig inside buildTypes { release { ... } }
  if (!gradle.includes('signingConfig signingConfigs.release')) {
    gradle = gradle.replace(/release\s*\{/, `release {\n            signingConfig signingConfigs.release`);
  }

  fs.writeFileSync(gradlePath, gradle, 'utf8');
  console.log('✓ Updated android/app/build.gradle with Release signing config');
} else {
  console.warn('⚠️ build.gradle not found at:', gradlePath);
}

console.log('--- Android configuration complete ---');

