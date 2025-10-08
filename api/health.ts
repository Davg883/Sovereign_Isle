/**
 * Simple health check endpoint for testing API routing
 */
export const handleHealthCheck = (req: any, res: any) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: 'ok', message: 'API router is working!' }));
};

export default handleHealthCheck;
