import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  configs: [],
  loading: false,
  error: null,
};

const botSlice = createSlice({
  name: 'botConfig',
  initialState,
  reducers: {
    setConfigs(state, action) {
      state.configs = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const { setConfigs, setLoading, setError } = botSlice.actions;
export default botSlice.reducer;
