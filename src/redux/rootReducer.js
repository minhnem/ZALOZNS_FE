import { combineReducers } from '@reduxjs/toolkit';
import facebookPagesReducer from '../features/facebook-pages/pageSlice';
import botConfigReducer from '../features/bot-config/botSlice';
import authReducer from '../features/auth/authSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  facebookPages: facebookPagesReducer,
  botConfig: botConfigReducer,
});

export default rootReducer;
