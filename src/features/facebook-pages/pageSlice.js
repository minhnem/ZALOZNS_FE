import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  pages: [],
  loading: false,
  error: null,
};

const pageSlice = createSlice({
  name: 'facebookPages',
  initialState,
  reducers: {
    setPages(state, action) {
      state.pages = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const { setPages, setLoading, setError } = pageSlice.actions;
export default pageSlice.reducer;
