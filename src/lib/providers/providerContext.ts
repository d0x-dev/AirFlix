import axios from 'axios';
import {getBaseUrl} from './getBaseUrl';
import {headers} from './headers';
import * as cheerio from 'cheerio';
import {ProviderContext} from './types';
import * as Crypto from 'expo-crypto';
import {openWebView} from '../services/wafResolver';

/**
 * Context for provider functions.
 * This context is used to pass common dependencies to provider functions.
 */

export const providerContext: ProviderContext = {
  axios,
  getBaseUrl,
  commonHeaders: headers,
  Crypto,
  cheerio,
  openWebView,
};
