import { Router } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

router.get('/', (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { server: 'OK', db: 'Connected' }, // We assume db is connected if server is running
        'NextCard BD API is healthy and running!'
      )
    );
});

export default router;