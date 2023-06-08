module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()){
        // TODO Flash message
        if (req.originalUrl == '/chat'){
            // Redirect to homepage TO BE UPDATED
            return res.redirect('/');
        }
        else {
            return res.redirect('/login');
        }
    }
    next();
}