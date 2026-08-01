import { combineReducers } from '@reduxjs/toolkit';
import facebookPagesReducer from '../features/facebook-pages/pageSlice';
import botConfigReducer from '../features/bot-config/botSlice';

const rootReducer = combineReducers({
  facebookPages: facebookPagesReducer,
  botConfig: botConfigReducer,
});

export default rootReducer;
