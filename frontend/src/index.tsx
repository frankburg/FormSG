import 'focus-visible/dist/focus-visible.min.js'
import './assets/fonts/inter.css'

import * as React from 'react'
import ReactDOM from 'react-dom'

import { App } from './app/App'
import reportWebVitals from './reportWebVitals'
import * as serviceWorker from './serviceWorker'

if (process.env.NODE_ENV === 'development') {
  import('./mocks/msw/browser').then(({ worker }) => worker.start())
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorker.unregister()

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()