# web-release-detector

A lightweight library for detecting and notifying users about new releases of web applications.

## Features

- 🚀 Automatic detection of new releases
- 🔄 Customizable refresh notification UI
- ⚙️ Configurable polling interval
- 🎯 Vue Router integration support
- 📦 TypeScript support

## Installation

```bash
npm install web-release-detector
```

or

```bash
yarn add web-release-detector
```

## Usage

### Basic Usage

```typescript
import { releaseInspect } from 'web-release-detector';

// Start monitoring for new releases
releaseInspect({
  DURATION: 120000, // Check every 2 minutes (default: 120000ms)
});
```

### With Vue Router

```typescript
import { releaseInspect } from 'web-release-detector';
import Vue from 'vue';
import router from './router';

releaseInspect({
  Vue,
  router,
  DURATION: 120000,
});
```

### Custom Notification UI

```typescript
import { releaseInspect } from 'web-release-detector';

releaseInspect({
  customCreateDom: (options) => {
    // Create your custom notification UI
    const div = document.createElement('div');
    div.innerHTML = 'New version available!';
    document.body.appendChild(div);
  },
  callback: () => {
    console.log('New version detected!');
  },
});
```

## API

### releaseInspect(options)

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `DURATION` | `number` | `120000` | Polling interval in milliseconds |
| `Vue` | `Vue` | `undefined` | Vue instance for router integration |
| `router` | `VueRouter` | `undefined` | Vue Router instance |
| `callback` | `function` | `undefined` | Callback function when new version is detected |
| `container` | `HTMLElement` | `document.body` | Container element for notification UI |
| `gateway` | `string` | `location.origin` | Gateway URL for fetching latest version |
| `customCreateDom` | `function` | `undefined` | Custom function to create notification UI |

## How It Works

The library works by:

1. Fetching the current page HTML at regular intervals
2. Extracting all `<script>` tags with `src` attributes
3. Comparing the script sources with the previous fetch
4. Displaying a notification when differences are detected

## Vue Router Meta Field

You can disable release inspection for specific routes by setting `releaseInspect: false` in the route's meta field:

```javascript
{
  path: '/admin',
  component: AdminView,
  meta: {
    releaseInspect: false, // Disable for this route
  },
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

