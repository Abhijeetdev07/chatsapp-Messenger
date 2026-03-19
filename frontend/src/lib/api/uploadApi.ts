import api from '../axios';

export const uploadApi = {
  uploadFile: (file: File) => {
    // Dynamically wrap blob inputs explicitly for multipart consumption natively
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },
};
