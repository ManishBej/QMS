export function requireRole(roles) {
  const required = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const userRoles = (req.user && req.user.roles) || [];
    const allowed = required.some(r => userRoles.includes(r));
    if (!allowed) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

export default requireRole;
